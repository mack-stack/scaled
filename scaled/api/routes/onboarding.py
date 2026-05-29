"""
Onboarding Autopilot — API Routes

GET  /api/onboarding/funnel                   — funnel visualization data
GET  /api/onboarding/{customer_id}            — customer onboarding status
GET  /api/onboarding/{customer_id}/next-steps — Claude-generated next steps
POST /api/onboarding/scan                     — trigger batch evaluation
GET  /api/onboarding/{customer_id}/journey    — full journey timeline
"""

from fastapi import APIRouter

from scaled.core.time import utcnow
from sqlalchemy import desc

from scaled.db.models import (
    Communication,
    Customer,
    Play,
    PlayType,
    get_session,
)
from scaled.modules.onboarding.lifecycle import (
    STALL_THRESHOLDS,
    evaluate_customer_stage,
    generate_next_steps,
    check_for_stalls,
    celebrate_milestone,
)
from scaled.modules.onboarding.batch import (
    get_onboarding_funnel,
    run_onboarding_scan,
)

router = APIRouter()


@router.get("/funnel")
def funnel():
    """Onboarding funnel visualization data — customers per stage, conversion rates."""
    return get_onboarding_funnel()


@router.get("/{customer_id}")
def get_onboarding_status(customer_id: int):
    """Customer's current onboarding status with stage evaluation."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found"}

        stage = customer.onboarding_stage
        stage_value = stage.value if stage else "signed_up"

        # Time at current stage
        now = utcnow()
        days_at_stage = (now - customer.last_active).days if customer.last_active else 0

        # Stall threshold for this stage
        threshold = STALL_THRESHOLDS.get(stage)
        is_stalled = threshold is not None and days_at_stage >= threshold

        # Re-evaluate stage based on current data
        eval_result = evaluate_customer_stage(customer_id)

        return {
            "customer_id": customer_id,
            "company": customer.company,
            "name": customer.name,
            "segment": customer.segment.value if customer.segment else None,
            "plan_tier": customer.plan_tier.value if customer.plan_tier else None,
            "onboarding_stage": eval_result.get("computed_stage", stage_value),
            "previous_stage": eval_result.get("previous_stage"),
            "stage_changed": eval_result.get("changed", False),
            "days_at_stage": days_at_stage,
            "stall_threshold": threshold,
            "is_stalled": is_stalled,
            "usage_profile": eval_result.get("usage_profile", {}),
        }
    finally:
        session.close()


@router.get("/{customer_id}/next-steps")
def next_steps(customer_id: int):
    """Claude-generated personalized next steps for this customer."""
    return generate_next_steps(customer_id)


@router.post("/scan")
def scan():
    """Trigger a batch onboarding evaluation across all customers."""
    return run_onboarding_scan()


@router.get("/{customer_id}/journey")
def journey(customer_id: int):
    """Full journey timeline — stage transitions, plays, communications."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found"}

        # All plays for this customer (onboarding-related)
        onboarding_play_types = [
            PlayType.ONBOARDING_NUDGE,
            PlayType.REACTIVATION,
            PlayType.MILESTONE_CELEBRATION,
            PlayType.EXPANSION_SIGNAL,
        ]

        plays = session.query(Play).filter(
            Play.customer_id == customer_id,
            Play.play_type.in_(onboarding_play_types),
        ).order_by(desc(Play.created_at)).all()

        # All communications for this customer
        comms = session.query(Communication).filter(
            Communication.customer_id == customer_id,
        ).order_by(desc(Communication.sent_at.nullslast())).all()

        # Build timeline events
        timeline = []

        # Account creation
        if customer.created_at:
            timeline.append({
                "type": "account_created",
                "timestamp": customer.created_at.isoformat(),
                "detail": f"Account created — {customer.segment.value if customer.segment else 'unknown'} / {customer.plan_tier.value if customer.plan_tier else 'unknown'}",
            })

        for play in plays:
            event = {
                "type": "play",
                "timestamp": play.created_at.isoformat() if play.created_at else None,
                "play_type": play.play_type.value,
                "play_status": play.status.value if play.status else None,
                "trigger": play.trigger_signal,
            }
            timeline.append(event)

        for comm in comms:
            event = {
                "type": "communication",
                "timestamp": (comm.sent_at or comm.play.created_at if comm.play else None),
                "channel": comm.channel,
                "subject": comm.subject,
                "body_preview": comm.body[:200] + "..." if comm.body and len(comm.body) > 200 else comm.body,
                "generated_by": comm.generated_by,
                "opened": comm.opened_at is not None,
                "clicked": comm.clicked_at is not None,
            }
            # Normalize timestamp to string
            if event["timestamp"] and hasattr(event["timestamp"], "isoformat"):
                event["timestamp"] = event["timestamp"].isoformat()
            timeline.append(event)

        # Sort timeline by timestamp (newest first), handling None
        timeline.sort(
            key=lambda e: e.get("timestamp") or "0000-00-00",
            reverse=True,
        )

        return {
            "customer_id": customer_id,
            "company": customer.company,
            "current_stage": customer.onboarding_stage.value if customer.onboarding_stage else "signed_up",
            "account_age_days": (utcnow() - customer.created_at).days if customer.created_at else 0,
            "total_plays": len(plays),
            "total_communications": len(comms),
            "timeline": timeline,
        }
    finally:
        session.close()
