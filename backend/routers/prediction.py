from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Optional
import itertools
import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor

from services.rag import retrieve_evidence, generate_explanation
from services.fda_labels import get_interaction_notes
from services.summary import build_summary
from services.side_effects import get_many as get_side_effects_for
from utils.activity import log_activity
from utils.auth import get_optional_user_email, get_required_user_email  # noqa: F401
from utils.drug_lookup import validate_drug_pair, canonical_drug_name
from utils.logger import setup_logger
from services.predict import predict_interaction, get_model
from services.gradcam import generate_gradcam_pair
from utils.db import db
from routers.drugs_router import _resolve_brand_or_generic  # same brand->generic map as /api/drugs and /api/ocr

logger = setup_logger("prediction_router")
router = APIRouter()

class DDIRequest(BaseModel):
    drug1: str
    drug2: str


class MultiRequest(BaseModel):
    drugs: List[str]


# Set USE_LLM_EXPLANATION=1 in backend/.env to use the small language model for the explanation.
# It tends to state wrong medical facts, so the default is the fact-based summary.
USE_LLM_EXPLANATION = os.environ.get("USE_LLM_EXPLANATION", "0").strip() == "1"

# The model, Grad-CAM hooks and FLAN-T5 are shared singletons, so only one
# prediction runs at a time. These endpoints are plain `def` (not `async def`)
# so FastAPI runs them in a worker thread: a long prediction no longer freezes
# /api/health, /api/drugs or /api/predict/history for everyone else.
_pipeline_lock = threading.Lock()


def _resolve_and_validate(payload: DDIRequest):
    """Brand name -> generic -> the model's exact spelling, then validate.
    Returns (drug1, drug2) ready to use for image/chemistry lookups."""
    # Resolve brand names (e.g. "Dolo", "Crocin") to their generic equivalent
    # before doing anything else -- the model/chemistry data only knows generics.
    resolved1 = _resolve_brand_or_generic(payload.drug1)
    resolved2 = _resolve_brand_or_generic(payload.drug2)

    logger.info(f"Request received: {payload.drug1} + {payload.drug2} (resolved: {resolved1} + {resolved2})")

    is_valid, error = validate_drug_pair(resolved1, resolved2)
    if not is_valid:
        logger.warning(f"Validation failed: {error}")
        # If a brand name was converted, tell the user what we looked for.
        for typed, resolved in ((payload.drug1, resolved1), (payload.drug2, resolved2)):
            if typed.strip().lower() != resolved.strip().lower() and resolved in error:
                error = f"{error} (you entered '{typed}')"
                break
        raise HTTPException(status_code=400, detail=error)

    return canonical_drug_name(resolved1), canonical_drug_name(resolved2)


def _pipeline_events(drug1: str, drug2: str, user_email: Optional[str]):
    """Runs the whole prediction and yields ("stage", n) as each real stage
    starts, then ("result", response) at the end. Stages match the How It
    Works page: 0 identify drugs (done before this runs), 1 molecular
    analysis (model + Grad-CAM), 2 evidence retrieval, 3 explanation."""
    with _pipeline_lock:
        yield ("stage", 1)
        result = predict_interaction(drug1, drug2)
        model = get_model()
        gradcam_a_path, gradcam_b_path = generate_gradcam_pair(model, drug1, drug2)

        yield ("stage", 2)
        evidence, exact = retrieve_evidence(drug1, drug2, top_k=2)

        yield ("stage", 3)
        if USE_LLM_EXPLANATION:
            explanation = generate_explanation(drug1, drug2, result["severity"], evidence if exact else [])
            explanation_source = "ai"
        else:
            explanation = build_summary(drug1, drug2, result["severity"], result["confidence"],
                                        result["probabilities"], evidence, exact)
            explanation_source = "facts"

    # Outside the lock: this can call an external service (FDA labels) and must
    # not hold up other predictions. Never raises -- worst case a drug has no entry.
    with ThreadPoolExecutor(max_workers=2) as pool:
        side_effects_job = pool.submit(get_side_effects_for, [drug1, drug2])
        notes_job = pool.submit(get_interaction_notes, drug1, drug2)
        side_effects = side_effects_job.result()
        label_interactions = notes_job.result()

    response = {
        "drug1": drug1,  # the model's own spelling -- e.g. "Dolo" becomes "Acetaminophen" here
        "drug2": drug2,
        "severity": result["severity"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "gradcam": [gradcam_a_path, gradcam_b_path],
        "explanation": explanation,
        "explanation_source": explanation_source,  # "facts" = built from the numbers, "ai" = language model
        # Kept for older clients: just the pair names.
        "evidence_sources": [f"{e['drug1']} + {e['drug2']}" for e in evidence],
        # The actual dataset text, and whether it is about THIS pair.
        "evidence": evidence,
        "evidence_exact": exact,
        # Each drug's own side effects: {"drug","effects","source","label"} (general
        # facts about each drug alone, not effects of this interaction).
        "side_effects": side_effects,
        # What each drug's FDA label says about the OTHER drug, word for word (may be empty).
        "label_interactions": label_interactions,
        "timestamp": datetime.now(timezone.utc),
    }

    # Save to history -- never let a Mongo hiccup break the actual prediction response.
    try:
        db.prediction_history.insert_one({
            "user_email": user_email,  # None if the request had no valid token
            **response,
        })
    except Exception as e:
        logger.warning(f"Failed to save prediction history: {e}")

    yield ("result", response)


def _error_for(e: Exception):
    """Maps a pipeline exception to (status_code, detail), same as before."""
    if isinstance(e, FileNotFoundError):
        logger.error(f"Missing image: {e}")
        return 404, str(e)
    if isinstance(e, ValueError):
        logger.error(f"Missing chemistry data: {e}")
        return 404, str(e)
    logger.error(f"Internal error: {e}", exc_info=True)
    return 500, "Internal server error during prediction."


@router.post("/ddi")
def predict(payload: DDIRequest, user_email: Optional[str] = Depends(get_optional_user_email)):
    drug1, drug2 = _resolve_and_validate(payload)
    try:
        response = None
        for kind, value in _pipeline_events(drug1, drug2, user_email):
            if kind == "result":
                response = value
        return response
    except Exception as e:
        status, detail = _error_for(e)
        raise HTTPException(status_code=status, detail=detail)


MAX_MULTI_DRUGS = 6  # 6 drugs = 15 pairs
_SEVERITY_RANK = {"Safe": 0, "Moderate": 1, "Severe": 2}


@router.post("/multi")
def predict_multi(payload: MultiRequest, user_email: Optional[str] = Depends(get_optional_user_email)):
    """Checks every PAIR among 2-6 drugs (3 drugs = 3 pairs, 6 drugs = 15 pairs).
    This is the quick overview: severity, confidence and probabilities per pair only.
    The full result for one pair (Grad-CAM, explanation, evidence, side effects) is
    fetched on demand through /ddi, which also saves it to the user's history."""
    typed = [d.strip() for d in payload.drugs if d and d.strip()]
    if len(typed) < 2:
        raise HTTPException(status_code=400, detail="Enter at least two drugs.")
    if len(typed) > MAX_MULTI_DRUGS:
        raise HTTPException(status_code=400, detail=f"You can check up to {MAX_MULTI_DRUGS} drugs at once.")

    drugs = []
    for name in typed:
        canonical = canonical_drug_name(_resolve_brand_or_generic(name))
        if canonical is None:
            raise HTTPException(status_code=400, detail=f"Drug not found: '{name}'")
        if canonical in drugs:
            raise HTTPException(status_code=400, detail=f"'{name}' is the same drug as one already entered ({canonical}).")
        drugs.append(canonical)

    logger.info(f"Multi-drug request: {drugs}")
    pairs = []
    try:
        for a, b in itertools.combinations(drugs, 2):
            with _pipeline_lock:  # one pair at a time, so other users are not starved
                result = predict_interaction(a, b)
            pairs.append({
                "drug1": a,
                "drug2": b,
                "severity": result["severity"],
                "confidence": result["confidence"],
                "probabilities": result["probabilities"],
            })
    except Exception as e:
        status, detail = _error_for(e)
        raise HTTPException(status_code=status, detail=detail)

    pairs.sort(key=lambda p: (_SEVERITY_RANK.get(p["severity"], 1), p["confidence"]), reverse=True)
    counts = {"safe": 0, "moderate": 0, "severe": 0}
    for p in pairs:
        counts[p["severity"].lower()] = counts.get(p["severity"].lower(), 0) + 1
    top = pairs[0]
    log_activity(
        user_email, "multi_check", f"Checked {len(drugs)} drugs ({len(pairs)} pairs)",
        {"drugs": drugs, "counts": counts,
         "highest": f"{top['drug1']} × {top['drug2']} ({top['severity']})"},
    )
    return {"drugs": drugs, "pairs": pairs, "counts": counts}


def _line(obj) -> str:
    return json.dumps(jsonable_encoder(obj)) + "\n"


@router.post("/ddi/stream")
def predict_stream(payload: DDIRequest, user_email: Optional[str] = Depends(get_optional_user_email)):
    """Same prediction as /ddi, but streamed as one JSON object per line so the
    frontend can show REAL progress:
        {"type":"stage","stage":0..3}   a stage has started
        {"type":"result","data":{...}}  exactly what /ddi returns
        {"type":"error","detail":"..."} a failure after streaming began
    Bad input (unknown drug etc.) is rejected up front with a normal HTTP error."""
    drug1, drug2 = _resolve_and_validate(payload)

    def events():
        yield _line({"type": "stage", "stage": 0})
        try:
            for kind, value in _pipeline_events(drug1, drug2, user_email):
                if kind == "stage":
                    yield _line({"type": "stage", "stage": value})
                else:
                    yield _line({"type": "result", "data": value})
        except Exception as e:
            _, detail = _error_for(e)
            yield _line({"type": "error", "detail": detail})

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},  # ask proxies not to buffer
    )


@router.get("/history")
async def get_history(user_email: str = Depends(get_required_user_email)):
    records = list(
        db.prediction_history
        .find({"user_email": user_email}, {"_id": 0})
        .sort("timestamp", -1)
    )
    return {"history": records}