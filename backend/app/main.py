"""
PlotSure MVP — FastAPI Backend
Single service, modular monolith per ANTIGRAVITY.md
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import verify, certificates, history

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(verify.router)
app.include_router(certificates.router)
app.include_router(history.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "plotsure-api"}
