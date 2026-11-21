
"""
RAG service for MolRAG-DDI.

Uses pair-based interaction evidence:
    Drug 1, Drug 2, Interaction Description

Memory optimization:
    - The pair CSV is loaded once at startup for exact matching.
    - FAISS is loaded only when semantic fallback is required.
    - SentenceTransformer is loaded only when semantic fallback is required.
    - FLAN-T5 is loaded only when USE_LLM_EXPLANATION=1
      and an explanation is requested.

Requires these files in backend/models/:
    - faiss_index.bin
    - faiss_pair_order.csv
        Columns: Drug 1, Drug 2, Interaction Description
"""

import os
import threading

import pandas as pd
import numpy as np

from services.side_effects import (
    local_side_effects_text as _get_side_effects
)
from services.side_effects import (
    local_side_effects as get_side_effect_list
)  # noqa: F401 (kept for older imports)

from utils.logger import setup_logger


logger = setup_logger("rag_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")


# ============================================================
# LOAD PAIR DATASET
# ============================================================

# The CSV is comparatively lightweight and is required for
# exact drug-pair matching.

logger.info("Loading RAG pair dataset...")

PAIR_CSV_PATH = os.path.join(
    MODELS_DIR,
    "faiss_pair_order.csv"
)

_pair_df = pd.read_csv(PAIR_CSV_PATH)

logger.info(
    "RAG pair dataset loaded: %s records.",
    len(_pair_df)
)


# ============================================================
# LAZY-LOADED FAISS AND EMBEDDING MODEL
# ============================================================

# These components are not loaded during application startup.
# They are loaded only when an exact pair is not found and
# semantic fallback becomes necessary.

_index = None
_embedder = None

_rag_lock = threading.Lock()


def _load_semantic_components():
    """
    Loads FAISS index and SentenceTransformer exactly once.

    Uses a thread lock to prevent multiple simultaneous
    requests from loading duplicate copies into memory.
    """

    global _index, _embedder

    if _index is not None and _embedder is not None:
        return

    with _rag_lock:

        # Check again after acquiring the lock.
        if _index is not None and _embedder is not None:
            return

        logger.info(
            "Loading FAISS index and SentenceTransformer..."
        )

        import faiss

        from sentence_transformers import SentenceTransformer

        faiss_path = os.path.join(
            MODELS_DIR,
            "faiss_index.bin"
        )

        if not os.path.exists(faiss_path):
            raise FileNotFoundError(
                f"FAISS index not found: {faiss_path}"
            )

        # Load the pre-built FAISS vector index.
        _index = faiss.read_index(faiss_path)

        # Load the same embedding model used to build the index.
        _embedder = SentenceTransformer(
            "all-MiniLM-L6-v2",
            device="cpu"
        )

        logger.info(
            "RAG semantic components loaded successfully. "
            "%s evidence vectors available.",
            _index.ntotal
        )


# ============================================================
# LAZY-LOADED FLAN-T5 MODEL
# ============================================================

# FLAN-T5 is only required when USE_LLM_EXPLANATION=1.
# It is loaded on first use to avoid unnecessary memory usage.

_tokenizer = None
_model_t5 = None

_t5_lock = threading.Lock()


def _load_t5():
    """
    Loads FLAN-T5 tokenizer and model exactly once.

    The model is loaded on CPU to avoid requiring a GPU.
    """

    global _tokenizer, _model_t5

    if _model_t5 is not None:
        return

    with _t5_lock:

        # Check again after acquiring the lock.
        if _model_t5 is not None:
            return

        logger.info(
            "Loading FLAN-T5 model for the first time..."
        )

        from transformers import (
            AutoTokenizer,
            AutoModelForSeq2SeqLM
        )

        model_name = "google/flan-t5-base"

        _tokenizer = AutoTokenizer.from_pretrained(
            model_name
        )

        _model_t5 = AutoModelForSeq2SeqLM.from_pretrained(
            model_name
        )

        _model_t5.eval()

        logger.info(
            "FLAN-T5 model loaded successfully."
        )


# ============================================================
# EXACT DRUG-PAIR MATCHING
# ============================================================

def _exact_pair_matches(
    drug1: str,
    drug2: str,
    top_k: int
):
    """
    Searches for exact drug-pair matches.

    Matching is case-insensitive and supports both orders:

        Drug A + Drug B
        Drug B + Drug A

    Exact dataset evidence is preferred over semantic search.
    """

    d1 = drug1.strip().lower()
    d2 = drug2.strip().lower()

    col1 = (
        _pair_df["Drug 1"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    col2 = (
        _pair_df["Drug 2"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    mask = (
        ((col1 == d1) & (col2 == d2))
        |
        ((col1 == d2) & (col2 == d1))
    )

    matches = _pair_df[mask]

    results = []

    for _, row in matches.head(top_k).iterrows():

        results.append({
            "drug1": row["Drug 1"],
            "drug2": row["Drug 2"],
            "text": row["Interaction Description"],
        })

    return results


# ============================================================
# SEMANTIC FALLBACK USING FAISS
# ============================================================

def _semantic_fallback(
    drug1: str,
    drug2: str,
    top_k: int
):
    """
    Performs semantic retrieval when an exact drug-pair
    match is unavailable.

    The query is embedded using all-MiniLM-L6-v2.

    The FAISS index searches for the closest evidence vectors.

    IMPORTANT:
    Semantic results may be topically related rather than
    evidence about the exact requested drug pair.
    """

    # Load FAISS and embedding model only when required.
    _load_semantic_components()

    query = f"{drug1} and {drug2} interaction"

    query_vec = _embedder.encode(
        [query],
        convert_to_numpy=True
    ).astype("float32")

    distances, indices = _index.search(
        query_vec,
        top_k
    )

    results = []

    for idx in indices[0]:

        if idx < 0 or idx >= len(_pair_df):
            continue

        row = _pair_df.iloc[idx]

        results.append({
            "drug1": row["Drug 1"],
            "drug2": row["Drug 2"],
            "text": row["Interaction Description"],
        })

    return results


# ============================================================
# EVIDENCE RETRIEVAL
# ============================================================

def retrieve_evidence(
    drug1: str,
    drug2: str,
    top_k: int = 2
):
    """
    Retrieves interaction evidence for a drug pair.

    Returns:
        evidence_rows:
            List of retrieved evidence records.

        exact:
            True  = Evidence belongs to the exact drug pair.
            False = Evidence was retrieved through semantic search.

    Retrieval priority:

        1. Exact pair matching.
        2. FAISS semantic fallback if no exact match exists.
    """

    # First try exact pair matching.
    exact = _exact_pair_matches(
        drug1,
        drug2,
        top_k
    )

    if exact:

        logger.info(
            "Exact interaction evidence found for %s + %s",
            drug1,
            drug2
        )

        return exact, True

    # No exact match: use semantic fallback.
    logger.info(
        "No exact pair match for %s + %s; "
        "using semantic fallback.",
        drug1,
        drug2
    )

    semantic_results = _semantic_fallback(
        drug1,
        drug2,
        top_k
    )

    return semantic_results, False


# ============================================================
# FLAN-T5 EXPLANATION GENERATION
# ============================================================

def generate_explanation(
    drug1: str,
    drug2: str,
    severity: str,
    evidence: list
) -> str:
    """
    Generates a natural-language drug interaction explanation
    using Google FLAN-T5.

    FLAN-T5 is loaded only when this function is called.

    Evidence from unrelated drug pairs is not passed into the
    prompt when exact interaction evidence is unavailable.
    """

    # Load the language model only when needed.
    _load_t5()

    evidence_text = " ".join([
        e["text"] for e in evidence
    ])

    # Retrieve side-effect information.
    side_effects_1 = _get_side_effects(drug1)
    side_effects_2 = _get_side_effects(drug2)

    side_effects_block = ""

    if side_effects_1 or side_effects_2:

        side_effects_block = (
            f"Known side effects of {drug1}: "
            f"{side_effects_1 or 'not available'}.\n"

            f"Known side effects of {drug2}: "
            f"{side_effects_2 or 'not available'}.\n"
        )

    # Prepare evidence information.
    if evidence_text:

        evidence_line = (
            f"Relevant background evidence: "
            f"{evidence_text}\n"
        )

    else:

        evidence_line = (
            "No direct evidence for this exact pair was found; "
            "rely only on the predicted severity.\n"
        )

    # Build the explanation prompt.
    prompt = (
        "You are a clinical pharmacist explaining a drug "
        "interaction to a patient.\n"

        f"Drug A: {drug1}\n"
        f"Drug B: {drug2}\n"

        f"Predicted severity: {severity}\n"

        f"{evidence_line}"
        f"{side_effects_block}\n"

        "Write a clear explanation covering: "

        "(1) the likely pharmacological mechanism behind "
        "this interaction, "

        f"(2) why it is classified as {severity} severity, "

        "(3) specific symptoms or effects a patient might "
        "experience, drawing on the known side effects "
        "listed above where relevant "
        "(e.g. nausea, bleeding risk, drowsiness)."
    )

    # Tokenize the prompt.
    input_ids = _tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512
    ).input_ids

    # Generate the explanation.
    output_ids = _model_t5.generate(
        input_ids,
        max_length=220,
        min_length=60,
        num_beams=4,
        no_repeat_ngram_size=3,
        length_penalty=1.2,
        early_stopping=True,
    )

    explanation = _tokenizer.decode(
        output_ids[0],
        skip_special_tokens=True
    )

    logger.info(
        "RAG explanation generated for %s + %s",
        drug1,
        drug2
    )

    return explanation


# ============================================================
# COMBINED RETRIEVAL AND EXPLANATION
# ============================================================

def retrieve_and_explain(
    drug1: str,
    drug2: str,
    severity: str
) -> dict:
    """
    Compatibility function that performs evidence retrieval
    followed by FLAN-T5 explanation generation.

    Preserves the original response structure.
    """

    evidence, exact = retrieve_evidence(
        drug1,
        drug2,
        top_k=2
    )

    explanation = generate_explanation(
        drug1,
        drug2,
        severity,
        evidence if exact else []
    )

    return {
        "evidence_sources": [
            f"{e['drug1']} + {e['drug2']}"
            for e in evidence
        ],

        "evidence": evidence,

        "evidence_exact": exact,

        "explanation": explanation,
    }
