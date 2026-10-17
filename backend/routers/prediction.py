from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import os
import jwt

from services.rag import retrieve_and_explain
from utils.drug_lookup import validate_drug_pair, get_known_drugs
from utils.logger import setup_logger
from services.predict import predict_interaction, get_model
from services.gradcam import generate_gradcam_pair
from utils.db import db
from routers.drugs_router import _resolve_brand_or_generic  # same brand->generic map as /api/drugs and /api/ocr

logger = setup_logger("prediction_router")
router = APIRouter()

# The model's own drug list is keyed by exact image filename (e.g. "Acetaminophen"),
# while the catalogue and the brand dictionary use capitals ("ACETAMINOPHEN") and
# users type any case. Map lower-case -> the exact known spelling so all of these
# reach the same drug instead of failing validation on capitalisation alone.
_KNOWN_LOWER = {n.lower(): n for n in get_known_drugs()}


def _canonical(name: str) -> str:
    return _KNOWN_LOWER.get(name.strip().lower(), name.strip())

# Loaded after the above imports so config.py's load_dotenv() (triggered via
# services.predict's import chain) has already run and populated os.environ.
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    logger.warning(
        "JWT_SECRET not set -- predictions will be saved anonymously and "
        "GET /api/predict/history will always return 401. Add JWT_SECRET to "
        "backend/.env (same value as otp-backend/.env) to enable user history."
    )


class DDIRequest(BaseModel):
    drug1: str
    drug2: str


def _decode_token(authorization: Optional[str]) -> Optional[str]:
    """Returns the user's email if a valid Bearer JWT is present, else None.
    Never raises -- an invalid/missing token just means 'not logged in'."""
    if not authorization or not authorization.startswith("Bearer ") or not JWT_SECRET:
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("email")
    except jwt.PyJWTError:
        return None


def get_optional_user_email(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    return _decode_token(authorization)


def get_required_user_email(authorization: Optional[str] = Header(default=None)) -> str:
    email = _decode_token(authorization)
    if not email:
        raise HTTPException(status_code=401, detail="Please log in to view prediction history.")
    return email


@router.post("/ddi")
async def predict(payload: DDIRequest, user_email: Optional[str] = Depends(get_optional_user_email)):
    # Resolve brand names (e.g. "Dolo", "Crocin") to their generic equivalent
    # ("Paracetamol") before doing anything else -- the model/chemistry data
    # only knows generic names.
    drug1 = _canonical(_resolve_brand_or_generic(payload.drug1))
    drug2 = _canonical(_resolve_brand_or_generic(payload.drug2))

    logger.info(f"Request received: {payload.drug1} + {payload.drug2} (resolved: {drug1} + {drug2})")

    # ---- Task 5: validation ----
    is_valid, error = validate_drug_pair(drug1, drug2)
    if not is_valid:
        logger.warning(f"Validation failed: {error}")
        raise HTTPException(status_code=400, detail=error)

    try:
        # ---- Task 3, 7, 8: prediction + confidence + probabilities ----
        result = predict_interaction(drug1, drug2)

        # ---- Task 6: Grad-CAM ----
        model = get_model()
        gradcam_a_path, gradcam_b_path = generate_gradcam_pair(model, drug1, drug2)
        rag_result = retrieve_and_explain(drug1, drug2, result["severity"])

        response = {
            "drug1": drug1,  # resolved generic name -- e.g. "Dolo" becomes "Paracetamol" here
            "drug2": drug2,
            "severity": result["severity"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
            "gradcam": [gradcam_a_path, gradcam_b_path],
            "explanation": rag_result["explanation"],
            "evidence_sources": rag_result["evidence_sources"],
            "timestamp": datetime.utcnow(),
        }

        # Save to history -- never let a Mongo hiccup break the actual prediction response.
        try:
            db.prediction_history.insert_one({
                "user_email": user_email,  # None if the request had no valid token
                **response,
            })
        except Exception as e:
            logger.warning(f"Failed to save prediction history: {e}")

        return response

    except FileNotFoundError as e:
        logger.error(f"Missing image: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.error(f"Missing chemistry data: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during prediction.")


@router.get("/history")
async def get_history(user_email: str = Depends(get_required_user_email)):
    records = list(
        db.prediction_history
        .find({"user_email": user_email}, {"_id": 0})
        .sort("timestamp", -1)
    )
    return {"history": records}