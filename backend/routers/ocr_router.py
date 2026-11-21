
"""
OCR endpoint: image -> text (EasyOCR) -> fuzzy drug-name matching.

EasyOCR is initialized only when the first OCR request arrives.
"""

import io
import re
import threading
from typing import List, Optional

import numpy as np
from PIL import Image
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from rapidfuzz import process, fuzz, utils as fuzz_utils

from utils.activity import log_activity
from utils.auth import get_optional_user_email
from utils.logger import setup_logger
from routers.drugs_router import _get_all_drug_names, _resolve_brand_or_generic

logger = setup_logger("ocr_router")
router = APIRouter()

_reader = None
_reader_lock = threading.Lock()


def _get_reader():
    """Initialize EasyOCR once, only when OCR is requested."""
    global _reader

    if _reader is None:
        with _reader_lock:
            if _reader is None:
                import easyocr

                logger.info("Initializing EasyOCR reader.")
                _reader = easyocr.Reader(["en"], gpu=False)
                logger.info("EasyOCR reader loaded.")

    return _reader


def _extract_candidate_words(image_bytes: bytes) -> List[str]:
    reader = _get_reader()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    lines = reader.readtext(np.array(image), detail=0)

    candidates = []

    for line in lines:
        line = line.strip()

        if line:
            candidates.append(line)
            candidates.extend(
                word.strip()
                for word in re.split(r"[\s,/]+", line)
                if len(word.strip()) > 2
            )

    return list(dict.fromkeys(candidates))


def _match_candidates(
    candidate_words: List[str],
    min_score: float = 70.0,
    top_n: int = 5
):
    if not candidate_words:
        return []

    all_names = _get_all_drug_names()
    best_score = {}

    for word in candidate_words:
        resolved = _resolve_brand_or_generic(word)

        match = process.extractOne(
            resolved,
            all_names,
            scorer=fuzz.WRatio,
            processor=fuzz_utils.default_process
        )

        if match and match[1] >= min_score:
            name, score, _ = match

            if name not in best_score or score > best_score[name]:
                best_score[name] = score

    ranked = sorted(
        best_score.items(),
        key=lambda item: item[1],
        reverse=True
    )[:top_n]

    return [
        {"drug_name": name, "score": round(score, 1)}
        for name, score in ranked
    ]


@router.post("/ocr")
async def extract_drug_names(
    file: UploadFile = File(...),
    user_email: Optional[str] = Depends(get_optional_user_email)
):
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
        raise HTTPException(
            status_code=500,
            detail="Could not process this image."
        )

    matches = _match_candidates(candidate_words)

    if not matches:
        logger.info(
            f"No drug matches found. Raw OCR text: {candidate_words}"
        )
    else:
        names = [match["drug_name"] for match in matches]

        log_activity(
            user_email,
            "image_scan",
            f"Scanned a medicine photo: {', '.join(names[:3])}",
            {"matches": names}
        )

    return {
        "matches": matches,
        "raw_text": candidate_words
    }
