"""
Builds models/drug_side_effects.csv from the Indian medicine dataset
(medicine_data.csv: one row per brand product, with salt_composition and side_effects).

What it does
  1. Keeps only SINGLE-ingredient products, so a side-effect list really belongs to that
     one drug (combination products list effects of the combination).
  2. Splits side effects on commas that are NOT inside brackets, so an item such as
     "Flushing (sense of warmth in the face, ears, neck and trunk)" stays in one piece.
  3. Merges all products of the same ingredient: de-duplicated, alphabetical.
  4. Adds a row for every drug name your app uses (model drugs + catalog) whose name is a
     different spelling or salt form of an ingredient in the dataset, e.g.
     ABIRATERONE -> ABIRATERONE ACETATE, ACETAMINOPHEN -> PARACETAMOL.
     Every such row is listed in side_effects_alias_report.csv so it can be reviewed.

Usage (from the backend/ folder):
    python scripts/build_side_effects.py --dataset path/to/medicine_data.csv
"""
import argparse
import collections
import os
import re
import sys

import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- name cleaning ----------
DOSE = re.compile(r"\s*\(\s*[\d.,]+\s*[^)]*\)\s*$")      # "(500mg)", "(40IU)"
QUALIFIER = re.compile(r"\s*\([^)]*\)\s*$")              # "(NA)", "(Plain)", "(hCG)"


def clean_ingredient(text: str) -> str:
    x = str(text).strip()
    prev = None
    while prev != x:
        prev = x
        x = QUALIFIER.sub("", DOSE.sub("", x)).strip()
    return re.sub(r"\s+", " ", x).upper()


def split_items(text: str):
    """Split on commas that are not inside brackets."""
    items, cur, depth = [], "", 0
    for ch in str(text):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            items.append(cur.strip())
            cur = ""
        else:
            cur += ch
    items.append(cur.strip())
    return [re.sub(r"\s+", " ", i) for i in items if i.strip()]


# ---------- name matching (shared with the live lookup) ----------
sys.path.insert(0, BASE_DIR)
from utils.drug_names import match_key  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="medicine_data.csv")
    ap.add_argument("--catalog", default=os.path.join(BASE_DIR, "data", "combined_drug_catalog.csv"))
    ap.add_argument("--smiles", default=os.path.join(BASE_DIR, "models", "drug_smiles.csv"))
    ap.add_argument("--out", default=os.path.join(BASE_DIR, "models", "drug_side_effects.csv"))
    args = ap.parse_args()

    df = pd.read_csv(args.dataset, low_memory=False, usecols=["salt_composition", "side_effects"]).dropna()
    df["salt_composition"] = df["salt_composition"].astype(str)
    single = df[~df["salt_composition"].str.contains(r"\s\+\s")].copy()
    single["ing"] = single["salt_composition"].map(clean_ingredient)
    print(f"{len(df)} products, {len(single)} single-ingredient, {single['ing'].nunique()} distinct ingredients")

    # ---- merge all products of one ingredient ----
    merged = {}
    for ing, group in single.groupby("ing"):
        seen = {}
        for text in group["side_effects"]:
            for item in split_items(text):
                seen.setdefault(item.lower(), item)
        if seen:
            merged[ing] = (sorted(seen.values(), key=str.lower), len(group))

    rows = {}
    for ing, (items, n) in merged.items():
        rows[ing] = {"drug_name": ing, "side_effects": ", ".join(items), "n_products": n,
                     "matched_from": ing, "match_type": "exact"}

    # ---- names your app uses ----
    targets = set()
    for path in (args.catalog, args.smiles):
        if os.path.exists(path):
            targets |= set(pd.read_csv(path)["drug_name"].astype(str).str.strip().str.upper())

    by_key = collections.defaultdict(list)
    for ing in merged:
        by_key[match_key(ing)].append(ing)

    alias_report = []
    for target in sorted(targets):
        if target in rows:
            continue
        sources = by_key.get(match_key(target))
        if not sources:
            continue
        seen = {}
        for s in sources:
            for item in merged[s][0]:
                seen.setdefault(item.lower(), item)
        rows[target] = {
            "drug_name": target,
            "side_effects": ", ".join(sorted(seen.values(), key=str.lower)),
            "n_products": sum(merged[s][1] for s in sources),
            "matched_from": " | ".join(sources),
            "match_type": "same active ingredient (spelling or salt form)",
        }
        alias_report.append({"drug_name": target, "matched_from": " | ".join(sources)})

    out = pd.DataFrame(rows.values()).sort_values("drug_name")
    out.to_csv(args.out, index=False)
    pd.DataFrame(alias_report).to_csv(os.path.join(os.path.dirname(args.out), "side_effects_alias_report.csv"), index=False)

    pred = set(pd.read_csv(args.smiles)["drug_name"].astype(str).str.upper()) if os.path.exists(args.smiles) else set()
    cat = set(pd.read_csv(args.catalog)["drug_name"].astype(str).str.upper()) if os.path.exists(args.catalog) else set()
    have = set(out["drug_name"])
    print(f"wrote {len(out)} rows to {args.out}  ({len(alias_report)} alias rows to review)")
    if pred:
        print(f"model drugs with side effects:   {len(pred & have)} of {len(pred)}")
    if cat:
        print(f"catalog drugs with side effects: {len(cat & have)} of {len(cat)}")


if __name__ == "__main__":
    main()
