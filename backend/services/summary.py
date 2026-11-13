"""
A plain, fact-based summary of one prediction. No language model: every sentence below is
built from numbers the model returned or text from the evidence dataset, so nothing can be
invented. (The old FLAN-T5 paragraph is still available with USE_LLM_EXPLANATION=1.)
"""
from typing import Optional

_ORDER = ["safe", "moderate", "severe"]


def _percent(value: float) -> str:
    return f"{value * 100:.0f}%"


def build_summary(drug1: str, drug2: str, severity: str, confidence: float,
                  probabilities: Optional[dict], evidence: list, exact: bool) -> str:
    probs = probabilities or {}
    parts = [f"The model predicts a {severity.lower()} interaction between {drug1} and {drug2} "
             f"({confidence:.1f}% confidence)."]

    if probs:
        parts.append(
            "Its estimate for each level is "
            + ", ".join(f"{k} {_percent(probs[k])}" for k in _ORDER if k in probs) + "."
        )
        others = sorted(((probs[k], k) for k in _ORDER if k in probs and k != severity.lower()), reverse=True)
        if confidence < 70 and others:
            p, k = others[0]
            parts.append(f"It is not very sure: {k} is the next most likely level ({_percent(p)}).")

    if exact and evidence and evidence[0].get("text"):
        parts.append(f"The evidence dataset has a record for this exact pair: \u201c{evidence[0]['text'].strip()}\u201d")
    else:
        parts.append(
            "The evidence dataset has no record for this exact pair, so this is an estimate made from the "
            "drugs' molecular structures and chemical properties alone. It has not been confirmed by a clinical source."
        )
    return " ".join(parts)