"""
Drugs A-Z, Drug Details, and Compare Drugs endpoints.
Search is case-insensitive AND typo-tolerant (fuzzy) -- safe here since this
is just browsing/searching, not running a prediction. Also checks brand names
(e.g. "Dolo" resolves to "Paracetamol") via brand_name_mapping.csv.
"""

import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from rapidfuzz import process, fuzz, utils as fuzz_utils

from utils.db import db
from utils.drug_lookup import get_known_drugs

router = APIRouter()

# ---- Load brand name -> generic name mapping once at startup ----
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_brand_map_path = os.path.join(BASE_DIR, "models", "brand_name_mapping.csv")

if os.path.exists(_brand_map_path):
    _brand_df = pd.read_csv(_brand_map_path)
    _BRAND_TO_GENERIC = {
        row["brand_name"].strip().lower(): row["generic_name"].strip()
        for _, row in _brand_df.iterrows()
    }
else:
    _BRAND_TO_GENERIC = {}


def _get_all_drug_names() -> list:
    return [doc["drug_name"] for doc in db.drug_catalog.find({}, {"drug_name": 1})]


def _resolve_brand_or_generic(query: str) -> str:
    """If query matches a known brand name, return the generic name to search for instead."""
    lower = query.strip().lower()
    if lower in _BRAND_TO_GENERIC:
        return _BRAND_TO_GENERIC[lower]
    return query


@router.get("/predictable-drugs")
async def list_predictable_drugs():
    """The actual set of drugs the ML model can predict with -- i.e. drugs
    with a generated image + chemistry entry (see utils/drug_lookup.py).
    This is usually SMALLER than the full /drugs catalog, so the Prediction
    page's autocomplete should suggest from this list, not from /drugs,
    to avoid suggesting a drug that then fails prediction."""
    return {"drugs": sorted(get_known_drugs())}


@router.get("/drugs")
async def list_drugs(letter: Optional[str] = None, search: Optional[str] = None,
                      page: int = 1, page_size: int = 50):
    if search:
        # If the search term is a known brand name (e.g. "Dolo"), search for its generic name instead
        search = _resolve_brand_or_generic(search)

        all_names = _get_all_drug_names()
        # Fuzzy + case-insensitive: finds close matches even with typos or wrong case.
        # processor=fuzz_utils.default_process normalizes case/whitespace before scoring --
        # without it, "acitretin" vs "ACITRETIN" scores too low and gets filtered out
        # even though it's an exact match.
        matches = process.extract(
            search, all_names, scorer=fuzz.WRatio,
            processor=fuzz_utils.default_process, limit=page_size
        )
        matched_names = [m[0] for m in matches if m[1] >= 60]  # 60+ similarity score
        drugs = list(db.drug_catalog.find(
            {"drug_name": {"$in": matched_names}}, {"_id": 0, "drug_name": 1}
        ))
        return {"drugs": drugs, "total": len(drugs), "page": 1, "page_size": page_size}

    query = {}
    if letter:
        # Case-insensitive first-letter match
        query["drug_name"] = {"$regex": f"^{letter}", "$options": "i"}

    skip = (page - 1) * page_size
    cursor = db.drug_catalog.find(query, {"_id": 0, "drug_name": 1}) \
        .sort("drug_name", 1).skip(skip).limit(page_size)
    drugs = list(cursor)
    total = db.drug_catalog.count_documents(query)

    return {"drugs": drugs, "total": total, "page": page, "page_size": page_size}


@router.get("/drugs/{drug_name}")
async def get_drug_details(drug_name: str):
    # Resolve brand names (e.g. "Dolo" -> "Paracetamol") before looking up
    drug_name = _resolve_brand_or_generic(drug_name)

    # Case-insensitive exact lookup
    doc = db.drug_catalog.find_one(
        {"drug_name": {"$regex": f"^{drug_name}$", "$options": "i"}}, {"_id": 0}
    )
    if doc is None:
        # Try a fuzzy suggestion before giving up entirely
        all_names = _get_all_drug_names()
        match = process.extractOne(
            drug_name, all_names, scorer=fuzz.WRatio,
            processor=fuzz_utils.default_process
        )
        if match and match[1] >= 80:
            raise HTTPException(
                status_code=404,
                detail=f"Drug '{drug_name}' not found. Did you mean '{match[0]}'?"
            )
        raise HTTPException(status_code=404, detail=f"Drug '{drug_name}' not found.")
    return doc


class CompareRequest(BaseModel):
    drug_names: List[str]


@router.post("/compare")
async def compare_drugs(payload: CompareRequest):
    if len(payload.drug_names) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 drugs to compare.")

    all_names = _get_all_drug_names()
    results = []

    for original_name in payload.drug_names:
        # Resolve brand names (e.g. "Dolo" -> "Paracetamol") before looking up
        name = _resolve_brand_or_generic(original_name)

        # Case-insensitive exact match first
        doc = db.drug_catalog.find_one(
            {"drug_name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0}
        )
        if doc:
            results.append({**doc, "found": True})
            continue

        # Fuzzy fallback -- suggest, don't silently substitute
        match = process.extractOne(
            name, all_names, scorer=fuzz.WRatio,
            processor=fuzz_utils.default_process
        )
        suggestion = match[0] if match and match[1] >= 80 else None
        results.append({"drug_name": original_name, "found": False, "suggestion": suggestion})

    return {"drugs": results}