"""
Prediction service. The model is loaded ONCE as a module-level singleton
(Task 4) -- importing this module triggers the load; it is never reloaded
per-request.
"""

import torch
from config import DEVICE, MODEL_PATH, NUM_CLASSES, N_CHEM_FEATURES
from models.model_def import DrugInteractionFusionCNN, coral_probabilities
from utils.preprocessing import load_image_tensor, get_chem_features
from utils.logger import setup_logger

logger = setup_logger("predict_service")

# ---- Load model ONCE at import time ----
logger.info(f"Loading model on device: {DEVICE}")
_model = DrugInteractionFusionCNN(num_classes=NUM_CLASSES, n_chem_features=N_CHEM_FEATURES)

_checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
# Support both a raw state_dict and a full checkpoint dict (with epoch/optimizer/etc.)
state_dict = _checkpoint["model_state"] if "model_state" in _checkpoint else _checkpoint
_model.load_state_dict(state_dict)
_model.to(DEVICE)
_model.eval()
logger.info("Model loaded successfully.")


def predict_interaction(drug1: str, drug2: str):
    """
    Runs one forward pass. Batch size = 1 (Task 13) -- this is an inference
    endpoint, not a batch training loop, so no batching complexity needed.
    """
    img_a_tensor, _ = load_image_tensor(drug1)
    img_b_tensor, _ = load_image_tensor(drug2)
    chem_a_tensor = get_chem_features(drug1)
    chem_b_tensor = get_chem_features(drug2)

    img_a_tensor = img_a_tensor.to(DEVICE)
    img_b_tensor = img_b_tensor.to(DEVICE)
    chem_a_tensor = chem_a_tensor.to(DEVICE)
    chem_b_tensor = chem_b_tensor.to(DEVICE)

    with torch.no_grad():
        logits = _model(img_a_tensor, img_b_tensor, chem_a_tensor, chem_b_tensor)

    probabilities, predicted_index, confidence = coral_probabilities(logits)
    severity = ["Safe", "Moderate", "Severe"][predicted_index]

    logger.info(f"Prediction: {drug1} + {drug2} -> {severity} ({confidence}%)")

    return {
        "severity": severity,
        "confidence": confidence,
        "probabilities": probabilities,
    }


def get_model():
    """Exposes the loaded model for Grad-CAM to reuse without reloading."""
    return _model
