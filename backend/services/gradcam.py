"""
Grad-CAM for the fusion CORAL model. Since the model takes TWO drug images
(+ chemistry features) rather than one, standard Grad-CAM wrappers don't
apply directly -- DrugImageOnlyWrapper below fixes one drug's inputs as
constants so Grad-CAM can vary the other drug's image and attribute the
prediction to specific pixels in THAT image.
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
    """Wraps the model so Grad-CAM sees a single-image-input, class-logit-output model."""

    def __init__(self, model, fixed_img, fixed_chem, varying_chem, target_slot):
        super().__init__()
        self.model = model
        self.fixed_img = fixed_img
        self.fixed_chem = fixed_chem
        self.varying_chem = varying_chem
        self.target_slot = target_slot  # "a" or "b"

    def forward(self, x):
        if self.target_slot == "a":
            return self.model(x, self.fixed_img, self.varying_chem, self.fixed_chem)
        return self.model(self.fixed_img, x, self.fixed_chem, self.varying_chem)


def get_target_layer(model):
    return model.encoder[-2][-1]  # last block of ResNet50's last stage


def generate_gradcam_pair(model, drug1: str, drug2: str) -> tuple:
    """
    Generates and saves Grad-CAM heatmaps for both drugs.
    Returns (path_to_drugA_heatmap, path_to_drugB_heatmap) as relative paths.
    """
    img_a_tensor, img_a_pil = load_image_tensor(drug1)
    img_b_tensor, img_b_pil = load_image_tensor(drug2)
    chem_a = get_chem_features(drug1).to(DEVICE)
    chem_b = get_chem_features(drug2).to(DEVICE)
    img_a_tensor = img_a_tensor.to(DEVICE)
    img_b_tensor = img_b_tensor.to(DEVICE)

    target_layer = get_target_layer(model)

    # ---- Drug A heatmap ----
    wrapper_a = DrugImageOnlyWrapper(model, img_b_tensor, chem_b, chem_a, target_slot="a")
    cam_a = GradCAM(model=wrapper_a, target_layers=[target_layer])
    grayscale_cam_a = cam_a(input_tensor=img_a_tensor, targets=None)[0]
    rgb_a = np.array(img_a_pil.resize((224, 224))).astype(np.float32) / 255.0
    overlay_a = show_cam_on_image(rgb_a, grayscale_cam_a, use_rgb=True)

    # ---- Drug B heatmap ----
    wrapper_b = DrugImageOnlyWrapper(model, img_a_tensor, chem_a, chem_b, target_slot="b")
    cam_b = GradCAM(model=wrapper_b, target_layers=[target_layer])
    grayscale_cam_b = cam_b(input_tensor=img_b_tensor, targets=None)[0]
    rgb_b = np.array(img_b_pil.resize((224, 224))).astype(np.float32) / 255.0
    overlay_b = show_cam_on_image(rgb_b, grayscale_cam_b, use_rgb=True)

    # ---- Save ----
    path_a = os.path.join(GRADCAM_OUTPUT_DIR, f"{drug1}_heatmap.png")
    path_b = os.path.join(GRADCAM_OUTPUT_DIR, f"{drug2}_heatmap.png")
    Image.fromarray(overlay_a).save(path_a)
    Image.fromarray(overlay_b).save(path_b)

    logger.info(f"Grad-CAM saved: {path_a}, {path_b}")

    return f"outputs/gradcam/{drug1}_heatmap.png", f"outputs/gradcam/{drug2}_heatmap.png"