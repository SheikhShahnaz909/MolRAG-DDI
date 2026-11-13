import os
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import prediction, health, drugs_router as drugs, ocr_router as ocr, activity

from routers.prediction import router as prediction_router

app = FastAPI(title="MolRAG-DDI API")

# For deployment set CORS_ORIGINS in backend/.env to your frontend address(es),
# comma separated, e.g. CORS_ORIGINS=https://molrag-ddi.vercel.app
# Left unset it allows every origin (fine for local development only).
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- Serve Grad-CAM heatmaps (and anything else in outputs/) as real URLs ---
# predict_interaction/generate_gradcam_pair already write into backend/outputs/gradcam/,
# this just makes that folder reachable over HTTP at /outputs/...
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# --- Mount the real prediction router (services/predict.py, gradcam.py, rag.py all live behind this) ---
app.include_router(prediction_router, prefix="/api/predict", tags=["prediction"])
app.include_router(drugs.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(activity.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "device": str(DEVICE)
    }