
"""
Prediction service.
Loads the trained model only when prediction is first requested.
The loaded model is then reused for subsequent predictions and Grad-CAM.
"""

import threading
import torch

from config import DEVICE, MODEL_PATH, NUM_CLASSES, N_CHEM_FEATURES
from models.model_def import DrugInteractionFusionCNN, coral_probabilities
from utils.preprocessing import load_image_tensor, get_chem_features
from utils.logger import setup_logger

logger = setup_logger("predict_service")

_model = None
_model_lock = threading.Lock()


def get_model():
    """
    Load the model once, when it is first needed.
    Subsequent calls return the same model instance.
    """
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info(f"Loading model on device: {DEVICE}")

                model = DrugInteractionFusionCNN(
                    num_classes=NUM_CLASSES,
                    n_chem_features=N_CHEM_FEATURES
                )

                checkpoint = torch.load(
                    MODEL_PATH,
                    map_location=DEVICE,
                    weights_only=True
                )

                state_dict = (
                    checkpoint["model_state"]
                    if isinstance(checkpoint, dict) and "model_state" in checkpoint
                    else checkpoint
                )

                model.load_state_dict(state_dict)
                model.to(DEVICE)
                model.eval()

                _model = model
                logger.info("Model loaded successfully.")

    return _model


def predict_interaction(drug1: str, drug2: str):
    """
    Predict interaction severity for a pair of drugs.
    Uses batch size 1 for inference.
    """

    model = get_model()

    img_a_tensor, _ = load_image_tensor(drug1)
    img_b_tensor, _ = load_image_tensor(drug2)

    chem_a_tensor = get_chem_features(drug1)
    chem_b_tensor = get_chem_features(drug2)

    img_a_tensor = img_a_tensor.to(DEVICE)
    img_b_tensor = img_b_tensor.to(DEVICE)
    chem_a_tensor = chem_a_tensor.to(DEVICE)
    chem_b_tensor = chem_b_tensor.to(DEVICE)

    with torch.inference_mode():
        logits = model(
            img_a_tensor,
            img_b_tensor,
            chem_a_tensor,
            chem_b_tensor
        )

    probabilities, predicted_index, confidence = coral_probabilities(logits)

    severity = ["Safe", "Moderate", "Severe"][predicted_index]

    logger.info(
        f"Prediction: {drug1} + {drug2} -> {severity} ({confidence}%)"
    )

    return {
        "severity": severity,
        "confidence": confidence,
        "probabilities": probabilities,
    }
