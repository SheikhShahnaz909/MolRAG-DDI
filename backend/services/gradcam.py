
"""
Grad-CAM for the fusion CORAL model.

The trained model is passed into this service and reused.
No additional model is loaded.
"""

import os
import numpy as np
import torch
import torch.nn as nn

from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

from config import DEVICE, GRADCAM_OUTPUT_DIR
from utils.preprocessing import load_image_tensor, get_chem_features
from utils.logger import setup_logger

logger = setup_logger("gradcam_service")


class DrugImageOnlyWrapper(nn.Module):
    """Expose one drug image as the variable Grad-CAM input."""

    def __init__(self, model, fixed_img, fixed_chem, varying_chem, target_slot):
        super().__init__()

        self.model = model
        self.fixed_img = fixed_img
        self.fixed_chem = fixed_chem
        self.varying_chem = varying_chem
        self.target_slot = target_slot

    def forward(self, x):
        if self.target_slot == "a":
            return self.model(
                x,
                self.fixed_img,
                self.varying_chem,
                self.fixed_chem
            )

        return self.model(
            self.fixed_img,
            x,
            self.fixed_chem,
            self.varying_chem
        )


def get_target_layer(model):
    """Return the final ResNet50 block."""
    return model.encoder[-2][-1]


def _generate_single_cam(model, image_tensor, fixed_img,
                         fixed_chem, varying_chem, target_layer,
                         target_slot, image_pil):

    wrapper = DrugImageOnlyWrapper(
        model,
        fixed_img,
        fixed_chem,
        varying_chem,
        target_slot
    )

    cam = GradCAM(
        model=wrapper,
        target_layers=[target_layer]
    )

    try:
        grayscale_cam = cam(
            input_tensor=image_tensor,
            targets=None
        )[0]

        rgb = (
            np.array(image_pil.resize((224, 224)))
            .astype(np.float32) / 255.0
        )

        return show_cam_on_image(
            rgb,
            grayscale_cam,
            use_rgb=True
        )

    finally:
        cam.activations_and_grads.release()


def generate_gradcam_pair(model, drug1: str, drug2: str) -> tuple:
    """
    Generate heatmaps for both drugs using the already-loaded model.
    Returns relative output paths.
    """

    os.makedirs(GRADCAM_OUTPUT_DIR, exist_ok=True)

    img_a_tensor, img_a_pil = load_image_tensor(drug1)
    img_b_tensor, img_b_pil = load_image_tensor(drug2)

    chem_a = get_chem_features(drug1).to(DEVICE)
    chem_b = get_chem_features(drug2).to(DEVICE)

    img_a_tensor = img_a_tensor.to(DEVICE)
    img_b_tensor = img_b_tensor.to(DEVICE)

    target_layer = get_target_layer(model)

    # Generate heatmap for Drug A.
    overlay_a = _generate_single_cam(
        model,
        img_a_tensor,
        img_b_tensor,
        chem_b,
        chem_a,
        target_layer,
        "a",
        img_a_pil
    )

    # Generate heatmap for Drug B.
    overlay_b = _generate_single_cam(
        model,
        img_b_tensor,
        img_a_tensor,
        chem_a,
        chem_b,
        target_layer,
        "b",
        img_b_pil
    )

    path_a = os.path.join(
        GRADCAM_OUTPUT_DIR,
        f"{drug1}_heatmap.png"
    )

    path_b = os.path.join(
        GRADCAM_OUTPUT_DIR,
        f"{drug2}_heatmap.png"
    )

    Image.fromarray(overlay_a).save(path_a)
    Image.fromarray(overlay_b).save(path_b)

    logger.info(f"Grad-CAM saved: {path_a}, {path_b}")

    return (
        f"outputs/gradcam/{drug1}_heatmap.png",
        f"outputs/gradcam/{drug2}_heatmap.png"
    )
