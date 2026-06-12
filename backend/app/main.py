"""
PlotSure MVP — FastAPI Backend
Single service, modular monolith per ANTIGRAVITY.md
"""
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import verify, history, auth
from app.routers import ml, gis, listings, inquiries, graph as graph_router
from app.routers import analytics, admin

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="PlotSure API",
    description="Land verification platform for Uganda — MVP",
    version="1.0.0",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow frontend
cors_origins = [settings.FRONTEND_URL]
if settings.FRONTEND_URL == "*":
    cors_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(verify.router)
app.include_router(ml.router)
app.include_router(gis.router)
app.include_router(history.router)
app.include_router(listings.router)
app.include_router(inquiries.router)
app.include_router(graph_router.router)
app.include_router(analytics.router)
app.include_router(admin.router)


@app.on_event("startup")
async def check_required_env_vars():
    """Log a warning for every required env var that is missing."""
    required = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "JWT_SECRET",
        "NEO4J_URI",
        "NEO4J_PASSWORD",
        "KAFKA_BOOTSTRAP_SERVERS",
    ]
    for var in required:
        if not os.getenv(var):
            logger.warning("Missing required env var: %s — service may not function correctly", var)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "plotsure-api"}
