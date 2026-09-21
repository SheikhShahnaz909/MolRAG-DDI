import torch
import os

# ---- Paths ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best_model.pt")
IMAGE_DIR = r"C:\MolRAG-DDI\backend\images"
GRADCAM_OUTPUT_DIR = os.path.join(BASE_DIR, "outputs", "gradcam")
LOG_DIR = os.path.join(BASE_DIR, "logs")

os.makedirs(GRADCAM_OUTPUT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# ---- Device ----
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---- Model config (must match training exactly) ----
ORDINAL_CLASSES = ["Safe", "Moderate", "Severe"]  # order matters -- this IS the ordinal scale
NUM_CLASSES = len(ORDINAL_CLASSES)
FP_BITS = 512          # Morgan fingerprint size used during training
N_LIPINSKI = 4          # molecular_weight, n_hba, n_hbd, logp
N_CHEM_FEATURES = N_LIPINSKI + FP_BITS

IMAGE_SIZE = (224, 224)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
