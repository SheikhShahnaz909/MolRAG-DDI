"""
Side-effect lookup from more than one place.

  1. LOCAL   models/drug_side_effects.csv -- instant, short list of effects (chips).
  2. FDA     the drug's FDA label, looked up live and cached (services/fda_labels.py). Used when
             the local file has nothing for a drug (or when the caller asks for both). It is a
             short word-for-word EXCERPT of the label's "Adverse Reactions" section plus a link
             to the full label.
  3. SAVED   optional models/drug_side_effects_fda.csv (drug_name, side_effects, source): FDA
             excerpts saved by an offline run, used without any network call.

Turn live lookups off with SIDE_EFFECTS_EXTERNAL=0 in backend/.env (see fda_labels.py).
"""
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import pandas as pd

from config import BASE_DIR
from services.fda_labels import EXTERNAL_ENABLED, FDA_SOURCE, get_adverse_label  # noqa: F401
from utils.drug_names import match_key
from utils.logger import setup_logger

logger = setup_logger("side_effects_service")

LOCAL_SOURCE = "Local medicine dataset"


# --------------------------------------------------------------------------
# 1. Local CSV
# --------------------------------------------------------------------------
_CSV_PATH = os.path.join(BASE_DIR, "models", "drug_side_effects.csv")
if os.path.exists(_CSV_PATH):
    _df = pd.read_csv(_CSV_PATH).fillna("")
    _LOCAL = {str(k).strip().upper(): str(v).strip() for k, v in zip(_df["drug_name"], _df["side_effects"])}
else:
    _LOCAL = {}
    logger.warning("drug_side_effects.csv not found -- only external sources will be used.")


# Optional: models/drug_side_effects_fda.csv (drug_name, side_effects, source), e.g. written by an
# offline script. Used as saved FDA excerpts: no network call needed for these drugs.
_FDA_SAVED = {}
_FDA_CSV_PATH = os.path.join(BASE_DIR, "models", "drug_side_effects_fda.csv")
if os.path.exists(_FDA_CSV_PATH):
    _fda_df = pd.read_csv(_FDA_CSV_PATH).fillna("")
    for _, _row in _fda_df.iterrows():
        _text = str(_row.get("side_effects", "")).strip()
        if _text:
            _FDA_SAVED[str(_row["drug_name"]).strip().upper()] = {
                "excerpt": _text,
                "source": str(_row.get("source", "")).strip() or FDA_SOURCE,
                "source_url": None,
                "product": None,
            }


def local_side_effects_text(name: str) -> str:
    return _LOCAL.get(str(name).strip().upper(), "")


def split_items(text: str) -> list:
    """Split on commas that are NOT inside brackets."""
    items, current, depth = [], "", 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            items.append(current.strip())
            current = ""
        else:
            current += ch
    items.append(current.strip())
    return [item for item in items if item]


def local_side_effects(name: str) -> list:
    return split_items(local_side_effects_text(name))


# --------------------------------------------------------------------------
# 2. Live FDA label (see services/fda_labels.py)
# --------------------------------------------------------------------------
def get_label_info(name: str) -> Optional[dict]:
    """Excerpt from the FDA label for this drug, or None (not found / unavailable)."""
    if not name or not name.strip():
        return None
    saved = _FDA_SAVED.get(name.strip().upper()) or _FDA_SAVED.get(match_key(name))
    if saved:
        return dict(saved)
    return get_adverse_label(name)


# --------------------------------------------------------------------------
# 3. Public API
# --------------------------------------------------------------------------
def get_side_effects_info(drug: str, external: str = "auto") -> dict:
    """
    external = "auto"   -> ask FDA only when the local file has nothing
               "always" -> ask FDA as well, even if local data exists
               "never"  -> local only
    Returns {"drug", "effects", "source", "label"}; label is None or
    {"excerpt", "source", "source_url", "product"}.
    """
    effects = local_side_effects(drug)
    label = None
    if external == "always" or (external == "auto" and not effects):
        label = get_label_info(drug)
    return {"drug": drug, "effects": effects, "source": LOCAL_SOURCE if effects else None, "label": label}


def get_many(drugs: list, external: str = "auto") -> list:
    """Looks several drugs up at the same time (external calls can be slow)."""
    with ThreadPoolExecutor(max_workers=max(1, len(drugs))) as pool:
        return list(pool.map(lambda d: get_side_effects_info(d, external), drugs))