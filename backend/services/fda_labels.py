"""
FDA drug labels from openFDA (https://open.fda.gov), looked up live and cached in MongoDB.

One label lookup per drug feeds three features:
  * side effects      -> excerpt of the "Adverse Reactions" section
  * drug information  -> what it is used for, drug class, routes, boxed warning
  * interaction notes -> sentences of a drug's "Drug Interactions" section that name the other drug

Answers are cached in the side_effect_cache collection (30 days; "no label" 3 days). A failed
network call is never cached. Only the drug name is sent to openFDA.

Settings in backend/.env (optional): SIDE_EFFECTS_EXTERNAL=0 turns all of this off,
OPENFDA_API_KEY raises the daily request limit, SIDE_EFFECTS_TIMEOUT sets the wait per request.
"""
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional

from utils.db import db
from utils.drug_names import label_search_names, match_key, search_terms
from utils.logger import setup_logger

logger = setup_logger("fda_labels")

FDA_SOURCE = "FDA drug label (openFDA)"
OPENFDA_URL = "https://api.fda.gov/drug/label.json"

EXTERNAL_ENABLED = os.environ.get("SIDE_EFFECTS_EXTERNAL", "1").strip() != "0"
OPENFDA_API_KEY = os.environ.get("OPENFDA_API_KEY", "").strip()
TIMEOUT_SECONDS = float(os.environ.get("SIDE_EFFECTS_TIMEOUT", "6"))
CACHE_FOUND_DAYS = 30
CACHE_MISSING_DAYS = 3
INTERACTIONS_MAX_CHARS = 12000  # enough to search; labels can be far longer

# --------------------------------------------------------------------------
# Cache (MongoDB, with an in-memory copy if Mongo is unavailable)
# --------------------------------------------------------------------------
_mem_cache = {}
_cache_lock = threading.Lock()


def _cache_get(key: str) -> Optional[dict]:
    doc = None
    try:
        doc = db.side_effect_cache.find_one({"_id": key})
    except Exception as e:
        logger.warning(f"cache read failed: {e}")
    if doc is None:
        with _cache_lock:
            doc = _mem_cache.get(key)
    if not doc:
        return None
    fetched = doc.get("fetched_at")
    if fetched is None:
        return None
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    max_age = timedelta(days=CACHE_FOUND_DAYS if doc.get("found") else CACHE_MISSING_DAYS)
    if datetime.now(timezone.utc) - fetched > max_age:
        return None
    return doc


def _cache_put(key: str, data: Optional[dict]) -> None:
    doc = {"_id": key, "found": data is not None, "data": data, "fetched_at": datetime.now(timezone.utc)}
    with _cache_lock:
        _mem_cache[key] = doc
    try:
        db.side_effect_cache.replace_one({"_id": key}, doc, upsert=True)
    except Exception as e:
        logger.warning(f"cache write failed: {e}")


# --------------------------------------------------------------------------
# openFDA requests
# --------------------------------------------------------------------------
class _Transient(Exception):
    """Network/server problem: don't cache, just report 'nothing right now'."""


def _http_get_json(url: str):
    """Returns parsed JSON, or None when openFDA says 'no matches' (HTTP 404)."""
    request = urllib.request.Request(url, headers={"User-Agent": "MolRAG-DDI/1.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise _Transient(f"HTTP {e.code}") from e
    except Exception as e:
        raise _Transient(str(e)) from e


def _openfda_search(field: str, name: str) -> list:
    term = name.replace('"', " ").strip()
    params = {"search": f'openfda.{field}:"{term}"', "limit": "10"}
    if OPENFDA_API_KEY:
        params["api_key"] = OPENFDA_API_KEY
    data = _http_get_json(OPENFDA_URL + "?" + urllib.parse.urlencode(params))
    return (data or {}).get("results", [])


# --------------------------------------------------------------------------
# Turning a label into short, word-for-word pieces
# --------------------------------------------------------------------------
_HEADING = re.compile(
    r"^(\d+(\.\d+)*\s*)?(ADVERSE REACTIONS|DRUG INTERACTIONS|INDICATIONS\s*(AND|&)\s*USAGE|BOXED WARNING|WARNING)\s*:?\s*",
    re.IGNORECASE,
)
_KEY_SENTENCE = re.compile(
    r"most (common|frequent)|commonly (reported|observed|seen)|frequently (reported|observed)|common adverse",
    re.IGNORECASE,
)


def _clean_text(parts) -> str:
    text = re.sub(r"\s+", " ", " ".join(parts or [])).strip()
    return _HEADING.sub("", text, count=1).strip()


_REF_MARKER = re.compile(r"^\(\s*\d+(\.\d+)*\s*(,\s*\d+(\.\d+)*\s*)*\)\s*")  # "(7.1 , 12.3)"
_LEAD_NUMBER = re.compile(r"^(\d+(\.\d+)*\s+|[•\-]\s*)")                         # "7.2 " or a bullet

# Sentences that are not about the drug's actual reactions (cross-references, reporting phone numbers).
_BOILERPLATE = re.compile(
    r"^(The following|Because clinical trials|Clinical trials are conducted|To report SUSPECTED|See |Refer to)"
    r"|described elsewhere|discussed in (more )?detail|\[see |report suspected adverse|1-800-FDA-1088|medwatch",
    re.IGNORECASE,
)


def _sentences(text: str) -> list:
    """Split into sentences. A new sentence may also start with '(' , '[' or a bullet (label tables
    often continue like 'raloxifene. (7.1 , 12.3) Warfarin : ...'); leading reference markers such as
    '(7.1 , 12.3)' and list numbers are dropped so each piece starts at its own words."""
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(\[•])", text)
    cleaned = []
    for part in parts:
        part = _REF_MARKER.sub("", part.strip())
        part = _LEAD_NUMBER.sub("", part).strip()
        if part:
            cleaned.append(part)
    return cleaned


def _shorten(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def _first_sentences(text: str, count: int, limit: int) -> str:
    return _shorten(" ".join(_sentences(text)[:count]), limit)


def _excerpt(text: str, limit: int = 520) -> str:
    """Adverse reactions: start at the words about the most common reactions if there are any,
    otherwise at the first sentences that are not cross-references or reporting boilerplate."""
    sentences = _sentences(text)
    useful = [x for x in sentences if not _BOILERPLATE.search(x)] or sentences
    for i, sentence in enumerate(useful):
        m = _KEY_SENTENCE.search(sentence)
        if m:
            start = sentence[m.start():]
            start = start[0].upper() + start[1:]
            return _shorten(" ".join([start] + useful[i + 1:i + 2]), limit)
    return _shorten(" ".join(useful[:3]), limit)


def _mention_excerpt(text: str, terms: list, limit: int = 700) -> Optional[str]:
    """Up to 3 sentences of `text` that name any of `terms` (whole words), or None."""
    if not text or not terms:
        return None
    pattern = re.compile(r"\b(" + "|".join(re.escape(t) for t in terms) + r")\b", re.IGNORECASE)
    hits = [x for x in _sentences(text) if pattern.search(x)]
    if not hits:
        return None
    return _shorten(" ".join(hits[:3]), limit)


def _clean_class(value: str) -> str:
    return re.sub(r"\s*\[[^\]]*\]\s*$", "", value).strip()


def _record_from_result(result: dict) -> dict:
    openfda = result.get("openfda") or {}
    set_id = result.get("set_id")
    adverse = _clean_text(result.get("adverse_reactions"))
    interactions = _clean_text(result.get("drug_interactions"))
    indications = _clean_text(result.get("indications_and_usage"))
    boxed = _clean_text(result.get("boxed_warning"))
    return {
        "product": (openfda.get("brand_name") or [None])[0],
        "source": FDA_SOURCE,
        "source_url": f"https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid={set_id}" if set_id else None,
        "adverse_excerpt": _excerpt(adverse) if len(adverse) >= 40 else None,
        "indications_excerpt": _first_sentences(indications, 2, 420) if len(indications) >= 20 else None,
        "interactions_text": interactions[:INTERACTIONS_MAX_CHARS] if len(interactions) >= 40 else None,
        "boxed_excerpt": _first_sentences(boxed, 2, 420) if len(boxed) >= 20 else None,
        "pharm_class": sorted({_clean_class(c) for c in openfda.get("pharm_class_epc", []) if c.strip()}),
        "routes": sorted({r.title() for r in openfda.get("route", []) if r.strip()}),
    }


def _completeness(record: dict) -> int:
    return sum(1 for k in ("adverse_excerpt", "indications_excerpt", "interactions_text") if record.get(k))


def _pick_label(results: list, key: str) -> Optional[dict]:
    """The most complete label for exactly this drug (never a combination product)."""
    best = None
    for result in results:
        openfda = result.get("openfda") or {}
        generic_keys = {match_key(n) for n in openfda.get("generic_name", [])}
        substance_keys = {match_key(n) for n in openfda.get("substance_name", [])}
        if generic_keys != {key} and substance_keys != {key}:
            continue
        record = _record_from_result(result)
        score = _completeness(record)
        if score and (best is None or score > _completeness(best)):
            best = record
    return best


def _fetch_openfda(name: str) -> Optional[dict]:
    key = match_key(name)
    deadline = time.monotonic() + 2 * TIMEOUT_SECONDS
    for candidate in label_search_names(name):
        for field in ("generic_name", "substance_name"):
            if time.monotonic() > deadline:
                raise _Transient("time budget used up")
            label = _pick_label(_openfda_search(field, candidate), key)
            if label:
                return label
    return None


# --------------------------------------------------------------------------
# Public functions
# --------------------------------------------------------------------------
def get_label_record(name: str) -> Optional[dict]:
    """The cached/fetched label record for a drug, or None (not found / unavailable / off)."""
    if not EXTERNAL_ENABLED or not name or not name.strip():
        return None
    key = f"openfda3:{match_key(name)}"  # bump the number whenever the excerpt rules change
    cached = _cache_get(key)
    if cached is not None:
        return cached.get("data")
    try:
        data = _fetch_openfda(name)
    except _Transient as e:
        logger.warning(f"openFDA lookup for '{name}' unavailable: {e}")
        return None
    _cache_put(key, data)
    return data


def get_adverse_label(name: str) -> Optional[dict]:
    """{"excerpt","source","source_url","product"} for the side-effects feature, or None."""
    record = get_label_record(name)
    if not record or not record.get("adverse_excerpt"):
        return None
    return {"excerpt": record["adverse_excerpt"], "source": record["source"],
            "source_url": record["source_url"], "product": record["product"]}


def get_drug_label_info(name: str) -> Optional[dict]:
    """What the label says the drug is for, its class, routes and boxed warning (for Drug Information)."""
    record = get_label_record(name)
    if not record:
        return None
    return {
        "product": record["product"],
        "pharm_class": record["pharm_class"],
        "routes": record["routes"],
        "indications": record["indications_excerpt"],
        "boxed_warning": record["boxed_excerpt"],
        "source": record["source"],
        "source_url": record["source_url"],
    }


def _note_for(label_drug: str, other_drug: str) -> dict:
    record = get_label_record(label_drug)
    if not record:
        return {"found": False, "note": None}
    excerpt = _mention_excerpt(record.get("interactions_text") or "", search_terms(other_drug))
    note = None
    if excerpt:
        note = {"label_drug": label_drug, "mentions": other_drug, "excerpt": excerpt, "product": record["product"],
                "source": record["source"], "source_url": record["source_url"]}
    return {"found": True, "note": note}


def get_interaction_notes(drug1: str, drug2: str) -> dict:
    """What each drug's FDA label says about the OTHER drug, word for word.
    {"notes": [...], "labels_checked": [{"drug", "found"}]}. labels_checked is empty when
    external lookups are off. A label that does not name the other drug proves nothing about safety."""
    if not EXTERNAL_ENABLED:
        return {"notes": [], "labels_checked": []}
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(_note_for, drug1, drug2)
            second = pool.submit(_note_for, drug2, drug1)
            results = [first.result(), second.result()]
    except Exception as e:  # never let this break a prediction
        logger.warning(f"interaction notes failed: {e}")
        return {"notes": [], "labels_checked": []}
    return {
        "notes": [r["note"] for r in results if r["note"]],
        "labels_checked": [{"drug": d, "found": r["found"]} for d, r in zip((drug1, drug2), results)],
    }