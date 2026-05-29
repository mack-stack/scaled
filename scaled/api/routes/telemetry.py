"""Telemetry & Plays Dashboard — FastAPI routes.

The unified cockpit for the CS Programs Manager, tying together signals
from Token Health, Incident Response, and Onboarding into a single view
with signal-to-action (play) mapping.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from scaled.modules.telemetry.signals import (
    compute_portfolio_signals,
    compute_customer_signals,
    detect_plays,
)
from scaled.modules.telemetry.plays import (
    execute_play,
    skip_play,
    get_play_queue,
    get_play_history,
)
from scaled.modules.telemetry.reports import generate_portfolio_report
from scaled.db.models import Customer, get_session

router = APIRouter()


# ── Request models ───────────────────────────────────────────────────────

class SkipPlayRequest(BaseModel):
    reason: str


# ── Portfolio routes ─────────────────────────────────────────────────────

@router.get("/portfolio")
def portfolio_dashboard():
    """Full portfolio dashboard — signals, health breakdown, revenue at risk, trends."""
    return compute_portfolio_signals()


@router.get("/portfolio/report")
def portfolio_report():
    """Claude-generated portfolio narrative report."""
    return generate_portfolio_report()


# ── Customer signal routes ───────────────────────────────────────────────

@router.get("/{customer_id}/signals")
def customer_signals(customer_id: int):
    """Individual customer signal roll-up."""
    result = compute_customer_signals(customer_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Play routes ──────────────────────────────────────────────────────────

@router.get("/plays")
def play_queue():
    """Pending plays needing action, sorted by priority."""
    return {"plays": get_play_queue()}


@router.get("/plays/history")
def play_history(customer_id: int | None = None):
    """Play execution history, optionally filtered by customer."""
    return {"plays": get_play_history(customer_id)}


@router.post("/plays/{play_id}/execute")
def execute_play_route(play_id: int):
    """Execute a pending play — generates communication via Claude."""
    result = execute_play(play_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/plays/{play_id}/skip")
def skip_play_route(play_id: int, body: SkipPlayRequest):
    """Skip a play with a reason."""
    result = skip_play(play_id, body.reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Detection trigger ────────────────────────────────────────────────────

@router.post("/detect")
def trigger_detection():
    """Trigger play detection across all customers.

    Scans every customer for actionable signals and creates plays
    where warranted.  Idempotent — won't create duplicates.
    """
    session = get_session()
    try:
        customer_ids = [c.id for c in session.query(Customer.id).all()]
    finally:
        session.close()

    all_new_plays = []
    errors = []
    for cid in customer_ids:
        try:
            new_plays = detect_plays(cid)
            all_new_plays.extend(new_plays)
        except Exception as exc:
            errors.append({"customer_id": cid, "error": str(exc)})

    return {
        "customers_scanned": len(customer_ids),
        "new_plays_created": len(all_new_plays),
        "plays": all_new_plays,
        "errors": errors,
    }
