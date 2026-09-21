from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rag import retrieve_and_explain
from utils.drug_lookup import validate_drug_pair
from utils.logger import setup_logger
from services.predict import predict_interaction, get_model
from services.gradcam import generate_gradcam_pair

logger = setup_logger("prediction_router")
router = APIRouter()


class DDIRequest(BaseModel):
    drug1: str
    drug2: str


@router.post("/predict")
async def predict(payload: DDIRequest):
    logger.info(f"Request received: {payload.drug1} + {payload.drug2}")

    # ---- Task 5: validation ----
    is_valid, error = validate_drug_pair(payload.drug1, payload.drug2)
    if not is_valid:
        logger.warning(f"Validation failed: {error}")
        raise HTTPException(status_code=400, detail=error)

    try:
        # ---- Task 3, 7, 8: prediction + confidence + probabilities ----
        result = predict_interaction(payload.drug1, payload.drug2)

        # ---- Task 6: Grad-CAM ----
        model = get_model()
        gradcam_a_path, gradcam_b_path = generate_gradcam_pair(model, payload.drug1, payload.drug2)
        rag_result = retrieve_and_explain(payload.drug1, payload.drug2, result["severity"])
        return {
            "drug1": payload.drug1,
            "drug2": payload.drug2,
            "severity": result["severity"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
            "gradcam": [gradcam_a_path, gradcam_b_path],
            "explanation": rag_result["explanation"],
            "evidence_sources": rag_result["evidence_sources"],
        }

    except FileNotFoundError as e:
        logger.error(f"Missing image: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.error(f"Missing chemistry data: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during prediction.")
