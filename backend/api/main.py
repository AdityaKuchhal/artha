"""
main.py — Artha FastAPI application.
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes.jobs import router as jobs_router
from backend.api.routes.shifts import router as shifts_router

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Artha API...")
    yield
    logger.info("Shutting down Artha API")


app = FastAPI(
    title="Artha API",
    description="Wealth with purpose — income tracking and expense intelligence",
    version=VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(jobs_router)
app.include_router(shifts_router)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": VERSION, "app": "artha"}
