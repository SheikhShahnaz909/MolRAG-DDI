"""
RAG service. Loads the pre-built FAISS index and flan-t5 model ONCE at import
time -- never reloaded per-request. Uses pair-based interaction evidence
(Drug 1, Drug 2, Interaction Description) rather than single-drug descriptions.

Requires these files in backend/models/:
    - faiss_index.bin
    - faiss_pair_order.csv   (columns: Drug 1, Drug 2, Interaction Description)
"""

import os
import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from utils.logger import setup_logger

logger = setup_logger("rag_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ---- Load everything ONCE ----
logger.info("Loading RAG components...")

_pair_df = pd.read_csv(os.path.join(MODELS_DIR, "faiss_pair_order.csv"))
_index = faiss.read_index(os.path.join(MODELS_DIR, "faiss_index.bin"))
_embedder = SentenceTransformer("all-MiniLM-L6-v2")

_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
_model_t5 = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")

logger.info(f"RAG ready: {_index.ntotal} evidence vectors loaded.")


def _retrieve_evidence(drug1: str, drug2: str, top_k: int = 2):
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


def retrieve_and_explain(drug1: str, drug2: str, severity: str) -> dict:
    """
    Called by routers/prediction.py after the model has already predicted severity.
    Returns {"evidence_sources": [...], "explanation": "..."}
    """
    evidence = _retrieve_evidence(drug1, drug2, top_k=2)
    evidence_text = " ".join([e["text"] for e in evidence])

    prompt = (
        f"Drug interaction prediction: {drug1} and {drug2} have a {severity} interaction. "
        f"Relevant background: {evidence_text} "
        f"Explain in simple terms why this interaction might be {severity}."
    )

    input_ids = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).input_ids
    output_ids = _model_t5.generate(input_ids, max_length=150)
    explanation = _tokenizer.decode(output_ids[0], skip_special_tokens=True)

    logger.info(f"RAG explanation generated for {drug1} + {drug2}")

    return {
        "evidence_sources": [f"{e['drug1']} + {e['drug2']}" for e in evidence],
        "explanation": explanation,
    }