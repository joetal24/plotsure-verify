"""Graph endpoints — ownership chain explorer backed by Neo4j."""
import logging
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.services.graph import graph_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/graph", tags=["Graph"])


@router.get("/ownership/{plot_ref}")
async def get_ownership(plot_ref: str, user: dict = Depends(get_current_user)):
    """Return the full ownership chain for a plot — all past + current owners."""
    result = await graph_service.get_ownership_chain(plot_ref)
    total = len(result["ownership"])
    return {
        "plot_ref": plot_ref,
        "ownership": result["ownership"],
        "total": total,
    }


@router.get("/person/{name}")
async def get_person(name: str, user: dict = Depends(get_current_user)):
    """Return all plots owned (past or present) by a person."""
    result = await graph_service.get_person_plots(name)
    total = len(result["plots"])
    return {
        "person": name,
        "plots": result["plots"],
        "total": total,
    }
