"""
Drug name validation. Checks against the drugs your MODEL actually knows
(i.e., has a generated molecule image + chemistry data for) -- not a
general-purpose drug database lookup.

Names are matched case-insensitively and always converted to the exact
spelling the model files use (images/<Name>.png, drug_smiles.csv,
lipinski_lookup.csv), because those lookups are case-sensitive. This matters
for brand names: brand_name_mapping.csv maps e.g. "Dolo" to an UPPERCASE
generic, while the model files use mixed case.
"""

import os
from typing import Optional

import pandas as pd

from config import IMAGE_DIR, BASE_DIR
from utils.drug_names import match_key

_MODELS_DIR = os.path.join(BASE_DIR, "models")


def _names_from_csv(filename: str) -> set:
    path = os.path.join(_MODELS_DIR, filename)
    if not os.path.exists(path):
        return set()
    return set(pd.read_csv(path)["drug_name"].astype(str))


def get_known_drugs() -> set:
    """Drugs the model can really predict with: a molecule image AND a SMILES
    row AND a Lipinski row (all three are needed by utils/preprocessing.py)."""
    if not os.path.isdir(IMAGE_DIR):
        return set()
    with_image = {f[:-4] for f in os.listdir(IMAGE_DIR) if f.endswith(".png")}
    return with_image & _names_from_csv("drug_smiles.csv") & _names_from_csv("lipinski_lookup.csv")


# Computed once at startup. After adding drugs with add_new_drugs.py, restart
# uvicorn. /api/predictable-drugs uses this same set, so suggestions and
# validation can never disagree.
_KNOWN_DRUGS = get_known_drugs()
_CANONICAL = {name.lower(): name for name in _KNOWN_DRUGS}

# Other spellings / salt forms of a model drug ("Aspirin" -> "Acetylsalicylic acid",
# "Paracetamol" -> "Acetaminophen", "Warfarin sodium" -> "Warfarin"). Only used when the
# key points to exactly ONE model drug, so an ambiguous name is never guessed.
_BY_KEY = {}
for _name in sorted(_KNOWN_DRUGS):
    _BY_KEY.setdefault(match_key(_name), []).append(_name)
_BY_KEY = {k: v[0] for k, v in _BY_KEY.items() if len(v) == 1}


def known_drugs_sorted() -> list:
    return sorted(_KNOWN_DRUGS)


def canonical_drug_name(name: str) -> Optional[str]:
    """Returns the model's exact spelling for a drug (case-insensitive, also other
    spellings/salt forms of the same drug), or None."""
    if not name:
        return None
    direct = _CANONICAL.get(name.strip().lower())
    return direct or _BY_KEY.get(match_key(name))


def validate_drug_pair(drug1: str, drug2: str):
    """
    Returns (is_valid, error_message). error_message is None if valid.
    """
    if not drug1 or not drug1.strip():
        return False, "drug1 is missing."
    if not drug2 or not drug2.strip():
        return False, "drug2 is missing."

    drug1, drug2 = drug1.strip(), drug2.strip()

    if drug1.lower() == drug2.lower():
        return False, "drug1 and drug2 must be different drugs."

    if canonical_drug_name(drug1) is None:
        return False, f"Drug not found: '{drug1}'"
    if canonical_drug_name(drug2) is None:
        return False, f"Drug not found: '{drug2}'"

    return True, None


_LIPINSKI = None


def model_drug_profile(name: str) -> Optional[dict]:
    """Chemistry numbers of a model drug (from lipinski_lookup.csv), for drugs that are not in
    the browsing catalog. Returns None if the name is not a model drug."""
    global _LIPINSKI
    canonical = canonical_drug_name(name)
    if canonical is None:
        return None
    if _LIPINSKI is None:
        path = os.path.join(_MODELS_DIR, "lipinski_lookup.csv")
        _LIPINSKI = pd.read_csv(path).set_index("drug_name") if os.path.exists(path) else pd.DataFrame()
    if canonical not in _LIPINSKI.index:
        return None
    row = _LIPINSKI.loc[canonical]

    def num(value):
        value = float(value)
        return None if value != value else round(value, 2)  # NaN -> None

    return {
        "drug_name": canonical,
        "molecular_weight": num(row["molecular_weight"]),
        "logp": num(row["logp"]),
        "n_hba": num(row["n_hba"]),
        "n_hbd": num(row["n_hbd"]),
        "source": "Model drug data",
    }