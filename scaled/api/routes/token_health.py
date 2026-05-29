"""Token Health Monitor — FastAPI routes.

Prefix: /api/token-health (set in main.py)
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from scaled.db.models import (
    Customer, HealthCheck, HealthStatus, CustomerSegment,
    get_session,
)
from scaled.modules.token_health.analyzer import analyze_customer_health
from scaled.modules.token_health.batch import (
    run_health_check_all,
    run_health_check_segment,
)

router = APIRouter()


# ── Request / response models ────────────────────────────────────────────

class ScanRequest(BaseModel):
    segment: Optional[str] = None  # None = all customers


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/")
def portfolio_health_summary():
    """Portfolio-level health summary: counts by status, top at-risk customers."""
    session = get_session()
    try:
        # Counts by status
        status_counts = {}
        for status in HealthStatus:
            count = (
                session.query(Customer)
                .filter(Customer.health_status == status)
                .count()
            )
            status_counts[status.value] = count

        total = sum(status_counts.values())

        # Top 10 at-risk / critical customers (worst scores first)
        at_risk_customers = (
            session.query(Customer)
            .filter(Customer.health_status.in_([HealthStatus.AT_RISK, HealthStatus.CRITICAL]))
            .order_by(Customer.health_score.asc())
            .limit(10)
            .all()
        )

        top_at_risk = [
            {
                "customer_id": c.id,
                "customer_name": c.name,
                "company": c.company,
                "segment": c.segment.value if c.segment else None,
                "health_score": c.health_score,
                "health_status": c.health_status.value if c.health_status else None,
            }
            for c in at_risk_customers
        ]

        return {
            "total_customers": total,
            "status_counts": status_counts,
            "top_at_risk": top_at_risk,
        }
    finally:
        session.close()


@router.get("/{customer_id}")
def customer_health(customer_id: int):
    """Individual customer health analysis — triggers a fresh analysis."""
    result = analyze_customer_health(customer_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/{customer_id}/history")
def customer_health_history(
    customer_id: int,
    limit: int = Query(default=20, ge=1, le=100),
):
    """Historical health checks for a customer, most recent first."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

        checks = (
            session.query(HealthCheck)
            .filter(HealthCheck.customer_id == customer_id)
            .order_by(HealthCheck.timestamp.desc())
            .limit(limit)
            .all()
        )

        return {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "company": customer.company,
            "current_score": customer.health_score,
            "current_status": customer.health_status.value if customer.health_status else None,
            "history": [
                {
                    "id": hc.id,
                    "score": hc.score,
                    "status": hc.status.value if hc.status else None,
                    "signals": hc.signals,
                    "recommendations": hc.recommendations,
                    "timestamp": hc.timestamp.isoformat() if hc.timestamp else None,
                }
                for hc in checks
            ],
        }
    finally:
        session.close()


@router.post("/scan")
def trigger_batch_scan(body: ScanRequest):
    """Trigger a batch health scan — all customers or a specific segment."""
    if body.segment:
        # Validate before running
        valid_segments = [s.value for s in CustomerSegment]
        if body.segment not in valid_segments:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid segment '{body.segment}'. Valid: {valid_segments}",
            )
        return run_health_check_segment(body.segment)
    return run_health_check_all()


@router.get("/{customer_id}/recommendations")
def customer_recommendations(customer_id: int):
    """Claude-generated optimization recommendations for a customer.

    Returns recommendations from the most recent health check, or triggers
    a fresh analysis if none exist.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

        latest = (
            session.query(HealthCheck)
            .filter(HealthCheck.customer_id == customer_id)
            .order_by(HealthCheck.timestamp.desc())
            .first()
        )
    finally:
        session.close()

    if latest and latest.recommendations:
        return {
            "customer_id": customer_id,
            "customer_name": customer.name,
            "company": customer.company,
            "health_score": latest.score,
            "health_status": latest.status.value if latest.status else None,
            "recommendations": latest.recommendations,
            "checked_at": latest.timestamp.isoformat() if latest.timestamp else None,
        }

    # No existing check — run a fresh analysis
    result = analyze_customer_health(customer_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return {
        "customer_id": customer_id,
        "customer_name": result["customer_name"],
        "company": result["company"],
        "health_score": result["health_score"],
        "health_status": result["health_status"],
        "recommendations": result["recommendations"],
        "checked_at": result["checked_at"],
    }
