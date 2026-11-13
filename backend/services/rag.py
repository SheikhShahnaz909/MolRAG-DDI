"""
RAG service. Loads the pre-built FAISS index and flan-t5 model ONCE at import
time -- never reloaded per-request. Uses pair-based interaction evidence
(Drug 1, Drug 2, Interaction Description) rather than single-drug descriptions.

Requires these files in backend/models/:
    - faiss_index.bin
    - faiss_pair_order.csv   (columns: Drug 1, Drug 2, Interaction Description)
"""

import os
import threading
import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from services.side_effects import local_side_effects_text as _get_side_effects
from services.side_effects import local_side_effects as get_side_effect_list  # noqa: F401  (kept for older imports)
from utils.logger import setup_logger

logger = setup_logger("rag_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ---- Load everything ONCE ----
logger.info("Loading RAG components...")

_pair_df = pd.read_csv(os.path.join(MODELS_DIR, "faiss_pair_order.csv"))
_index = faiss.read_index(os.path.join(MODELS_DIR, "faiss_index.bin"))
_embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Side-effect data (local CSV and the live external lookup) is in services/side_effects.py,
# so the explanation prompt and the API use one source.

# FLAN-T5 is only needed when USE_LLM_EXPLANATION=1, so it is loaded on first use
# (saves memory and start-up time when it is off).
_tokenizer = None
_model_t5 = None
_t5_lock = threading.Lock()


def _load_t5():
    global _tokenizer, _model_t5
    if _model_t5 is None:
        with _t5_lock:
            if _model_t5 is None:
                logger.info("Loading FLAN-T5 (first use)...")
                _tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
                _model_t5 = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")

logger.info(f"RAG ready: {_index.ntotal} evidence vectors loaded.")


def _exact_pair_matches(drug1: str, drug2: str, top_k: int):
    """Look for rows where (Drug 1, Drug 2) match the query in either order,
    case-insensitively. This is the ground truth when it exists -- semantic
    search is only a fallback for pairs missing from the dataset."""
    d1, d2 = drug1.strip().lower(), drug2.strip().lower()
    col1 = _pair_df["Drug 1"].str.strip().str.lower()
    col2 = _pair_df["Drug 2"].str.strip().str.lower()

    mask = ((col1 == d1) & (col2 == d2)) | ((col1 == d2) & (col2 == d1))
    matches = _pair_df[mask]

    results = []
    for _, row in matches.head(top_k).iterrows():
        results.append({
            "drug1": row["Drug 1"],
            "drug2": row["Drug 2"],
            "text": row["Interaction Description"],
        })
    return results


def _semantic_fallback(drug1: str, drug2: str, top_k: int):
    """Used only when no exact pair exists in the evidence dataset. NOTE: the
    index was built by embedding evidence text, not drug names, so this is an
    approximate fallback -- results may be topically related rather than
    pair-specific."""
    query = f"{drug1} and {drug2} interaction"
    query_vec = _embedder.encode([query]).astype("float32")
    distances, indices = _index.search(query_vec, top_k)

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


def retrieve_evidence(drug1: str, drug2: str, top_k: int = 2):
    """Returns (evidence_rows, exact). exact=True means the rows are about this
    exact pair; False means they are only semantically related (the pair isn't
    in the evidence dataset)."""
    exact = _exact_pair_matches(drug1, drug2, top_k)
    if exact:
        return exact, True
    logger.info(f"No exact pair match for {drug1} + {drug2}; using semantic fallback")
    return _semantic_fallback(drug1, drug2, top_k), False


def generate_explanation(drug1: str, drug2: str, severity: str, evidence: list) -> str:
    """FLAN-T5 summary. `evidence` should be [] when there is no record for
    this exact pair, so the model is not handed text about other drugs (which
    it would otherwise blend into the answer)."""
    _load_t5()
    evidence_text = " ".join([e["text"] for e in evidence])

    side_effects_1 = _get_side_effects(drug1)
    side_effects_2 = _get_side_effects(drug2)
    side_effects_block = ""
    if side_effects_1 or side_effects_2:
        side_effects_block = (
            f"Known side effects of {drug1}: {side_effects_1 or 'not available'}.\n"
            f"Known side effects of {drug2}: {side_effects_2 or 'not available'}.\n"
        )

    if evidence_text:
        evidence_line = f"Relevant background evidence: {evidence_text}\n"
    else:
        evidence_line = "No direct evidence for this exact pair was found; rely only on the predicted severity.\n"

    prompt = (
        f"You are a clinical pharmacist explaining a drug interaction to a patient.\n"
        f"Drug A: {drug1}\n"
        f"Drug B: {drug2}\n"
        f"Predicted severity: {severity}\n"
        f"{evidence_line}"
        f"{side_effects_block}\n"
        f"Write a clear explanation covering: "
        f"(1) the likely pharmacological mechanism behind this interaction, "
        f"(2) why it is classified as {severity} severity, and "
        f"(3) specific symptoms or effects a patient might experience, drawing on the "
        f"known side effects listed above where relevant (e.g. nausea, bleeding risk, drowsiness)."
    )

    input_ids = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).input_ids
    # min_length forces the model past its default tendency to stop after one
    # short sentence; beam search + no_repeat_ngram_size give more coherent,
    # less repetitive output than greedy decoding.
    output_ids = _model_t5.generate(
        input_ids,
        max_length=220,
        min_length=60,
        num_beams=4,
        no_repeat_ngram_size=3,
        length_penalty=1.2,
        early_stopping=True,
    )
    explanation = _tokenizer.decode(output_ids[0], skip_special_tokens=True)
    logger.info(f"RAG explanation generated for {drug1} + {drug2}")
    return explanation


def retrieve_and_explain(drug1: str, drug2: str, severity: str) -> dict:
    """Kept for compatibility: retrieval + explanation in one call."""
    evidence, exact = retrieve_evidence(drug1, drug2, top_k=2)
    explanation = generate_explanation(drug1, drug2, severity, evidence if exact else [])
    return {
        "evidence_sources": [f"{e['drug1']} + {e['drug2']}" for e in evidence],
        "evidence": evidence,
        "evidence_exact": exact,
        "explanation": explanation,
    }