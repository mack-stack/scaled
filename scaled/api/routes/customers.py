from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import func

from scaled.core.time import utcnow
from scaled.db.models import get_session, Customer, UsageEvent

router = APIRouter()


@router.get("")
def list_customers(segment: str | None = None):
    """List all customers with summary stats."""
    session = get_session()
    query = session.query(Customer)
    if segment:
        query = query.filter(Customer.segment == segment)
    customers = query.all()

    result = []
    for c in customers:
        # Get 30-day spend
        thirty_days_ago = utcnow() - timedelta(days=30)
        spend_30d = session.query(func.sum(UsageEvent.cost)).filter(
            UsageEvent.customer_id == c.id,
            UsageEvent.timestamp >= thirty_days_ago,
        ).scalar() or 0.0

        result.append({
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "segment": c.segment.value if c.segment else None,
            "plan_tier": c.plan_tier.value if c.plan_tier else None,
            "onboarding_stage": c.onboarding_stage.value if c.onboarding_stage else None,
            "seats": c.seats,
            "arr": c.arr,
            "monthly_commitment": c.monthly_commitment,
            "health_status": c.health_status.value if c.health_status else None,
            "health_score": c.health_score,
            "spend_30d": round(spend_30d, 2),
        })

    session.close()
    return {"customers": result, "total": len(result)}


@router.get("/{customer_id}")
def get_customer(customer_id: int):
    """Get detailed customer profile with usage history."""
    session = get_session()
    c = session.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        session.close()
        return {"error": "Customer not found"}

    thirty_days_ago = utcnow() - timedelta(days=30)

    # Usage summary by model
    usage_by_model = session.query(
        UsageEvent.model,
        func.sum(UsageEvent.input_tokens).label("input_tokens"),
        func.sum(UsageEvent.output_tokens).label("output_tokens"),
        func.sum(UsageEvent.cost).label("total_cost"),
        func.count(UsageEvent.id).label("event_count"),
    ).filter(
        UsageEvent.customer_id == c.id,
        UsageEvent.timestamp >= thirty_days_ago,
    ).group_by(UsageEvent.model).all()

    # Usage summary by endpoint
    usage_by_endpoint = session.query(
        UsageEvent.endpoint,
        func.sum(UsageEvent.cost).label("total_cost"),
        func.count(UsageEvent.id).label("event_count"),
    ).filter(
        UsageEvent.customer_id == c.id,
        UsageEvent.timestamp >= thirty_days_ago,
    ).group_by(UsageEvent.endpoint).all()

    # Daily spend trend (last 30 days) — uses date() for SQLite compat
    daily_spend = session.query(
        func.date(UsageEvent.timestamp).label("day"),
        func.sum(UsageEvent.cost).label("cost"),
    ).filter(
        UsageEvent.customer_id == c.id,
        UsageEvent.timestamp >= thirty_days_ago,
    ).group_by(func.date(UsageEvent.timestamp)).order_by(func.date(UsageEvent.timestamp)).all()

    session.close()

    return {
        "id": c.id,
        "name": c.name,
        "company": c.company,
        "email": c.email,
        "segment": c.segment.value,
        "plan_tier": c.plan_tier.value,
        "onboarding_stage": c.onboarding_stage.value,
        "seats": c.seats,
        "arr": c.arr,
        "monthly_commitment": c.monthly_commitment,
        "health_status": c.health_status.value,
        "health_score": c.health_score,
        "usage_by_model": [
            {"model": u.model, "input_tokens": u.input_tokens,
             "output_tokens": u.output_tokens, "cost": round(u.total_cost, 2),
             "events": u.event_count}
            for u in usage_by_model
        ],
        "usage_by_endpoint": [
            {"endpoint": u.endpoint, "cost": round(u.total_cost, 2), "events": u.event_count}
            for u in usage_by_endpoint
        ],
        "daily_spend": [
            {"date": str(d.day.date()) if d.day else None, "cost": round(d.cost, 2)}
            for d in daily_spend
        ],
    }
