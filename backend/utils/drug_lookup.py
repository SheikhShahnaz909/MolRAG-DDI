"""
Drug name validation. Checks against the drugs your MODEL actually knows
(i.e., has a generated molecule image + chemistry data for) -- not a
general-purpose drug database lookup. Autocomplete against a bigger drug
list is a separate, later task for another teammate.
"""

import os
from config import IMAGE_DIR


def get_known_drugs() -> set:
    """All drug names your model has an image for -- the true 'known' set."""
    if not os.path.isdir(IMAGE_DIR):
        return set()
    return {f[:-4] for f in os.listdir(IMAGE_DIR) if f.endswith(".png")}


_KNOWN_DRUGS = get_known_drugs()


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

    if drug1 not in _KNOWN_DRUGS:
        return False, f"Drug not found: '{drug1}'"
    if drug2 not in _KNOWN_DRUGS:
        return False, f"Drug not found: '{drug2}'"

    return True, None
