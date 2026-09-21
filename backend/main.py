from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import prediction, health
from utils.logger import setup_logger

logger = setup_logger("main")

app = FastAPI(
    title="MolRAG-DDI API",
    description="Drug-Drug Interaction severity prediction with Grad-CAM explainability.",
    version="1.0.0",
)

# CORS -- required for the React frontend to call this API from the browser.
# Tighten allow_origins to your actual frontend URL before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Grad-CAM images as static files so the frontend can display them directly
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

app.include_router(health.router, prefix="/api")
app.include_router(prediction.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info("MolRAG-DDI API starting up...")
    # Importing services.predict at module load time (via routers/prediction.py)
    # already triggers the model load -- this just confirms it in the logs.
    logger.info("Model and services ready.")
