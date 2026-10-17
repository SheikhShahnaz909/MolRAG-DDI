"""
EXAMPLE ONLY -- adapt to your FastAPI backend (I haven't seen your backend code).

The frontend first calls POST /api/predict/ddi/stream. If that route doesn't exist
(404/405) it silently falls back to your existing POST /api/predict/ddi, so you can
add this whenever you're ready and nothing breaks in the meantime.

The route streams newline-delimited JSON (NDJSON), one object per line:
    {"type": "stage", "stage": 0}    # 0 = identify & normalize drugs
    {"type": "stage", "stage": 1}    # 1 = analyse molecular structures
    {"type": "stage", "stage": 2}    # 2 = retrieve supporting evidence
    {"type": "stage", "stage": 3}    # 3 = generate the prediction
    {"type": "result", "data": {...}}  # EXACTLY what /api/predict/ddi returns today
    {"type": "error", "detail": "..."} # on failure

Send a stage event when that stage STARTS.
"""
import json

from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class DDIRequest(BaseModel):  # reuse your existing request model
    drug1: str
    drug2: str


def line(obj) -> str:
    return json.dumps(obj) + "\n"


@router.post("/api/predict/ddi/stream")
def predict_ddi_stream(req: DDIRequest, authorization: str | None = Header(default=None)):
    def events():
        try:
            yield line({"type": "stage", "stage": 0})
            # TODO: your existing code to identify / normalize req.drug1 and req.drug2

            yield line({"type": "stage", "stage": 1})
            # TODO: your existing molecular-image / GNN step

            yield line({"type": "stage", "stage": 2})
            # TODO: your existing retrieval (DrugBank / PubMed) step

            yield line({"type": "stage", "stage": 3})
            # TODO: your existing LLM explanation + final prediction

            # TODO: save to history exactly as your current endpoint does (uses `authorization`)
            result = {}  # TODO: the same dict your current endpoint returns
            yield line({"type": "result", "data": result})
        except Exception as exc:  # noqa: BLE001
            yield line({"type": "error", "detail": str(exc)})

    # Tip: move your current endpoint's body into a shared helper that takes a
    # `report(stage_index)` callback, then call it from both routes.
    return StreamingResponse(events(), media_type="application/x-ndjson")
