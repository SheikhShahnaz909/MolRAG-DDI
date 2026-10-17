"""
OCR endpoint: image -> raw text (EasyOCR) -> fuzzy match against drug_catalog
names and known brand names (RapidFuzz) -- reuses the same matching approach
already proven in drugs_router.py.

NOTE: images only for now. PDF prescriptions aren't supported here -- that
needs poppler (via pdf2image) to rasterize pages first, which is a separate
system dependency not yet installed.
"""
import io
import re
from typing import List

import numpy as np
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException
from rapidfuzz import process, fuzz, utils as fuzz_utils

from utils.logger import setup_logger
from routers.drugs_router import _get_all_drug_names, _resolve_brand_or_generic

logger = setup_logger("ocr_router")
router = APIRouter()

# Loaded once at import time, like the RAG/ML models -- EasyOCR's reader is
# slow to initialize and must not be recreated per-request.
import easyocr
_reader = easyocr.Reader(["en"], gpu=False)
logger.info("EasyOCR reader loaded.")


def _extract_candidate_words(image_bytes: bytes) -> List[str]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    lines = _reader.readtext(np.array(image), detail=0)  # list[str]

    # Drug names are usually a single word/line on packaging or a prescription,
    # but OCR sometimes merges words onto one line -- so keep both the full
    # line AND its individual tokens as separate candidates to match against.
    candidates = []
    for line in lines:
        line = line.strip()
        if line:
            candidates.append(line)
        candidates.extend(w.strip() for w in re.split(r"[\s,/]+", line) if len(w.strip()) > 2)

    return list(dict.fromkeys(candidates))  # de-dupe, keep order


def _match_candidates(candidate_words: List[str], min_score: float = 70.0, top_n: int = 5):
    if not candidate_words:
        return []

    all_names = _get_all_drug_names()
    best_score = {}

    for word in candidate_words:
        resolved = _resolve_brand_or_generic(word)
        match = process.extractOne(
            resolved, all_names, scorer=fuzz.WRatio,
            processor=fuzz_utils.default_process
        )
        if match and match[1] >= min_score:
            name, score, _ = match
            if name not in best_score or score > best_score[name]:
                best_score[name] = score

    ranked = sorted(best_score.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return [{"drug_name": name, "score": round(score, 1)} for name, score in ranked]


@router.post("/ocr")
async def extract_drug_names(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file (JPG/PNG). PDF prescriptions aren't supported yet."
        )

    image_bytes = await file.read()

    try:
        candidate_words = _extract_candidate_words(image_bytes)
    except Exception as e:
        logger.error(f"OCR failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not process this image.")

    matches = _match_candidates(candidate_words)

    if not matches:
        logger.info(f"No drug matches found. Raw OCR text: {candidate_words}")

    return {"matches": matches, "raw_text": candidate_words}