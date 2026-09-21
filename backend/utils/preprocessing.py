"""
Preprocessing utilities. Loads the fitted StandardScaler (exported from your
notebook -- see export instructions) rather than refitting it, so inference
uses the exact same feature scaling as training.
"""

import os
import joblib
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from rdkit import Chem
from rdkit.Chem import AllChem
import pandas as pd

from config import IMAGE_DIR, IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD, FP_BITS, BASE_DIR

eval_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
])

# ---- Load artifacts exported from your training notebook ----
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")
LIPINSKI_PATH = os.path.join(BASE_DIR, "models", "lipinski_lookup.csv")
SMILES_PATH = os.path.join(BASE_DIR, "models", "drug_smiles.csv")

_scaler = joblib.load(SCALER_PATH)
_lipinski_df = pd.read_csv(LIPINSKI_PATH).set_index("drug_name")
_smiles_df = pd.read_csv(SMILES_PATH).set_index("drug_name")


def load_image_tensor(drug_name: str):
    path = os.path.join(IMAGE_DIR, f"{drug_name}.png")
    if not os.path.exists(path):
        raise FileNotFoundError(f"No molecule image found for '{drug_name}'")
    img = Image.open(path).convert("RGB")
    return eval_transform(img).unsqueeze(0), img


def get_chem_features(drug_name: str) -> torch.Tensor:
    if drug_name not in _lipinski_df.index or drug_name not in _smiles_df.index:
        raise ValueError(f"No chemistry data found for '{drug_name}'")

    lipinski_raw = _lipinski_df.loc[drug_name, ["molecular_weight", "n_hba", "n_hbd", "logp"]].values.astype(float)
    lipinski_scaled = _scaler.transform([lipinski_raw])[0]

    smiles = _smiles_df.loc[drug_name, "smiles"]
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        fp = np.zeros(FP_BITS)
    else:
        fp = np.array(AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=FP_BITS))

    features = np.concatenate([lipinski_scaled, fp]).astype(np.float32)
    return torch.tensor(features, dtype=torch.float).unsqueeze(0)
