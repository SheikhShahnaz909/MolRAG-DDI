
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import drugs_router as drugs
from routers import ocr_router as ocr
from routers import activity
from routers.prediction import router as prediction_router

app = FastAPI(title="MolRAG-DDI API")

_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)

app.mount(
    "/outputs",
    StaticFiles(directory=OUTPUTS_DIR),
    name="outputs"
)

app.include_router(
    prediction_router,
    prefix="/api/predict",
    tags=["prediction"]
)

app.include_router(drugs.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(activity.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "message": "MolRAG-DDI API is running."
    }
