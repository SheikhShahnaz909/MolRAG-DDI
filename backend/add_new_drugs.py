"""
Adds new drugs to the set your model can actually predict on.

Three things gate whether a drug is "known" to the model (see
utils/drug_lookup.py and utils/preprocessing.py):
    1. backend/images/<DrugName>.png   -- the 2D molecule image
    2. backend/models/drug_smiles.csv  -- drug_name,smiles
    3. backend/models/lipinski_lookup.csv -- drug_name,molecular_weight,n_hba,n_hbd,logp

This script does all three for each drug you give it, computing chemistry
features via RDKit directly from SMILES -- no retraining needed, since the
model's scaler.pkl just transforms new feature vectors the same way it did
during training.

USAGE:
1. Edit DRUGS_TO_ADD below with the drug names you want (one per line).
   SMILES are auto-fetched from PubChem's free public API by name.
2. Run this from inside your backend/ folder:
       python add_new_drugs.py
3. Restart uvicorn (new .csv/.png files need a fresh server start, same as
   any other data file -- --reload won't catch this automatically).
4. Test one of the new drugs on Swagger.

Drugs that already exist, or whose name PubChem can't resolve, are skipped
with a message -- you'll need to find those SMILES manually (e.g. search
the drug name on https://pubchem.ncbi.nlm.nih.gov and copy its "Canonical
SMILES" field) and add them to the DRUGS_TO_ADD list as a (name, smiles)
tuple instead of a bare name.
"""

import os
import urllib.request
import urllib.parse
import json

import pandas as pd
from rdkit import Chem
from rdkit.Chem import Descriptors, Draw

# ============================================================
# EDIT THIS LIST
# ============================================================
# Either a bare name (SMILES auto-fetched from PubChem) or a
# (name, smiles) tuple if you already have the SMILES yourself.
DRUGS_TO_ADD = [
    # Common medicines people are likely to try. Names that are already known
    # are skipped automatically, so it is safe to run this whole list.
    "Aspirin", "Acetaminophen", "Metformin", "Omeprazole", "Pantoprazole", "Atorvastatin",
    "Simvastatin", "Amlodipine", "Losartan", "Lisinopril", "Metoprolol", "Atenolol",
    "Furosemide", "Hydrochlorothiazide", "Digoxin", "Clopidogrel", "Warfarin",
    "Ibuprofen", "Naproxen", "Diclofenac", "Aceclofenac", "Tramadol", "Gabapentin", "Pregabalin",
    "Amoxicillin", "Azithromycin", "Ciprofloxacin", "Doxycycline", "Metronidazole",
    "Cetirizine", "Levocetirizine", "Loratadine", "Montelukast", "Albuterol",
    "Prednisolone", "Levothyroxine", "Glimepiride", "Sertraline", "Fluoxetine",
    "Diazepam", "Alprazolam", "Ondansetron", "Domperidone", "Tranexamic acid", "Ketamine",
]

# ============================================================
# PATHS -- matches preprocessing.py's own layout
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR = os.path.join(BASE_DIR, "images")
SMILES_PATH = os.path.join(BASE_DIR, "models", "drug_smiles.csv")
LIPINSKI_PATH = os.path.join(BASE_DIR, "models", "lipinski_lookup.csv")
IMAGE_SIZE = (224, 224)  # matches config.py's IMAGE_SIZE


def fetch_smiles_from_pubchem(drug_name: str):
    """Looks up a drug's SMILES by name via PubChem's free REST API.
    PubChem has used different property field names over time
    (CanonicalSMILES, IsomericSMILES, or just SMILES) -- try all of them."""
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"
        f"{urllib.parse.quote(drug_name)}/property/CanonicalSMILES,IsomericSMILES,SMILES,ConnectivitySMILES/JSON"
    )
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read())
        props = data["PropertyTable"]["Properties"][0]
        for key in ("CanonicalSMILES", "IsomericSMILES", "SMILES", "ConnectivitySMILES"):
            if key in props:
                return props[key]
        print(f"  [PubChem lookup failed for '{drug_name}': no SMILES field in response: {props}]")
        return None
    except Exception as e:
        print(f"  [PubChem lookup failed for '{drug_name}': {e}]")
        return None


def add_drug(drug_name: str, smiles: str, smiles_df: pd.DataFrame, lipinski_df: pd.DataFrame):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        print(f"  [SKIPPED] '{drug_name}': RDKit could not parse this SMILES.")
        return smiles_df, lipinski_df

    # ---- Chemistry features (Lipinski descriptors) ----
    molecular_weight = Descriptors.MolWt(mol)
    n_hba = Descriptors.NumHAcceptors(mol)
    n_hbd = Descriptors.NumHDonors(mol)
    logp = Descriptors.MolLogP(mol)

    # ---- 2D molecule image ----
    img = Draw.MolToImage(mol, size=IMAGE_SIZE)
    img_path = os.path.join(IMAGE_DIR, f"{drug_name}.png")
    img.save(img_path)

    # ---- Append to the two lookup tables (overwrite if it already exists) ----
    smiles_df = smiles_df[smiles_df["drug_name"] != drug_name]
    smiles_df = pd.concat([smiles_df, pd.DataFrame([{"drug_name": drug_name, "smiles": smiles}])], ignore_index=True)

    lipinski_df = lipinski_df[lipinski_df["drug_name"] != drug_name]
    lipinski_df = pd.concat([lipinski_df, pd.DataFrame([{
        "drug_name": drug_name,
        "molecular_weight": molecular_weight,
        "n_hba": n_hba,
        "n_hbd": n_hbd,
        "logp": logp,
    }])], ignore_index=True)

    print(f"  [ADDED] '{drug_name}': MW={molecular_weight:.1f}, HBA={n_hba}, HBD={n_hbd}, LogP={logp:.2f}")
    return smiles_df, lipinski_df


def main():
    os.makedirs(IMAGE_DIR, exist_ok=True)

    smiles_df = pd.read_csv(SMILES_PATH)
    lipinski_df = pd.read_csv(LIPINSKI_PATH)
    existing_names = set(smiles_df["drug_name"]) & set(lipinski_df["drug_name"])

    print(f"Currently known drugs: {len(existing_names)}")
    print(f"Attempting to add {len(DRUGS_TO_ADD)} drug(s)...\n")

    for entry in DRUGS_TO_ADD:
        if isinstance(entry, tuple):
            drug_name, smiles = entry
        else:
            drug_name, smiles = entry, None

        if drug_name in existing_names:
            print(f"  [SKIPPED] '{drug_name}': already known.")
            continue

        if smiles is None:
            print(f"Looking up SMILES for '{drug_name}' via PubChem...")
            smiles = fetch_smiles_from_pubchem(drug_name)
            if smiles is None:
                print(f"  [SKIPPED] '{drug_name}': could not auto-fetch SMILES. "
                      f"Look it up manually at pubchem.ncbi.nlm.nih.gov and add as a tuple.")
                continue

        smiles_df, lipinski_df = add_drug(drug_name, smiles, smiles_df, lipinski_df)

    smiles_df.to_csv(SMILES_PATH, index=False)
    lipinski_df.to_csv(LIPINSKI_PATH, index=False)

    print(f"\nDone. Total known drugs now: {len(set(smiles_df['drug_name']) & set(lipinski_df['drug_name']))}")
    print("Restart uvicorn (full restart, not --reload) before testing.")


if __name__ == "__main__":
    main()