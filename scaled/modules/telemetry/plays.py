"""Play management — create, execute, skip, and query plays.

A "play" is a recommended CS action triggered by signals.  Execution
calls Claude to generate the appropriate communication/action, then
persists the result.
"""

import json
import logging
from typing import Any

from scaled.core.time import utcnow

from sqlalchemy import func

from scaled.core.config import get_settings
from scaled.db.models import (
    Customer, Play, PlayType, PlayStatus, Communication,
    HealthStatus, get_session,
)

logger = logging.getLogger(__name__)

# Health status → sort priority (lower = more urgent)
_HEALTH_PRIORITY = {
    HealthStatus.CRITICAL: 0,
    HealthStatus.AT_RISK: 1,
    HealthStatus.MONITOR: 2,
    HealthStatus.HEALTHY: 3,
}

# System prompt for play execution
_PLAY_EXECUTION_PROMPT = """\
You are a Customer Success Programs Manager at Anthropic, executing \
automated plays for scaled accounts.

Context:
- Anthropic shifted to usage-based token pricing in April 2026.
- Your tone is warm, professional, and data-driven.
- Always lead with empathy, then offer specific help.
- Reference exact numbers from the trigger signal.

Given the play type and trigger signal, generate the appropriate \
customer communication.

Return ONLY valid JSON (no markdown fences) with these keys:
{
  "subject": "<email subject line>",
  "body": "<email body, plain text>",
  "channel": "<email|in_app|slack>",
  "internal_notes": "<brief note for the CS team about this play>",
  "urgency": "<low|medium|high|critical>"
}

Rules:
- BURN_RATE_ALERT: Warn about overspend, offer optimization review call.
- CHURN_RISK: Empathetic outreach, ask what's changed, offer executive sponsor.
- EXPANSION_SIGNAL: Congratulate growth, offer enterprise features / volume discount.
- ONBOARDING_NUDGE: Helpful nudge with specific next-step guidance.
- REACTIVATION: Check in, share what's new, offer a re-onboarding session.
- TOKEN_OPTIMIZATION: Share specific savings opportunities (model routing, caching, batch).
- INCIDENT_OUTREACH: Acknowledge impact, share timeline, offer credits if appropriate.
- MILESTONE_CELEBRATION: Celebrate achievement, reinforce value.
"""


def _serialize_play(play: Play, customer: Customer | None = None) -> dict[str, Any]:
    """Convert a Play ORM object to a JSON-serializable dict."""
    result = {
        "play_id": play.id,
        "customer_id": play.customer_id,
        "play_type": play.play_type.value if play.play_type else None,
        "status": play.status.value if play.status else None,
        "trigger_signal": play.trigger_signal,
        "created_at": play.created_at.isoformat() if play.created_at else None,
        "executed_at": play.executed_at.isoformat() if play.executed_at else None,
        "result": play.result,
    }
    if customer:
        result["customer_name"] = customer.name
        result["company"] = customer.company
        result["health_status"] = customer.health_status.value if customer.health_status else None
        result["health_score"] = customer.health_score
        result["arr"] = round(customer.arr or 0.0, 2)
    return result


# ── CRUD operations ──────────────────────────────────────────────────────


def create_play(
    customer_id: int,
    play_type: PlayType,
    trigger_signal: dict[str, Any],
) -> dict[str, Any]:
    """Create a new play for a customer."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer {customer_id} not found"}

        play = Play(
            customer_id=customer_id,
            play_type=play_type,
            status=PlayStatus.PENDING,
            trigger_signal=trigger_signal,
        )
        session.add(play)
        session.commit()
        session.refresh(play)
        return _serialize_play(play, customer)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def execute_play(play_id: int) -> dict[str, Any]:
    """Execute a play — call Claude to generate the action, save communication.

    Falls back to a template-based response if Claude API key is not set.
    """
    session = get_session()
    try:
        play = session.query(Play).filter(Play.id == play_id).first()
        if not play:
            return {"error": f"Play {play_id} not found"}

        if play.status not in (PlayStatus.PENDING, PlayStatus.EXECUTING):
            return {"error": f"Play {play_id} is already {play.status.value}"}

        customer = session.query(Customer).filter(Customer.id == play.customer_id).first()
        if not customer:
            return {"error": f"Customer {play.customer_id} not found"}

        play.status = PlayStatus.EXECUTING
        session.flush()

        # Build communication via Claude or fallback
        settings = get_settings()
        now = utcnow()

        if settings.anthropic_api_key:
            try:
                from scaled.core.claude import ask_claude

                user_prompt = (
                    f"Play type: {play.play_type.value}\n"
                    f"Customer: {customer.name} ({customer.company})\n"
                    f"Segment: {customer.segment.value if customer.segment else 'unknown'}\n"
                    f"Plan: {customer.plan_tier.value if customer.plan_tier else 'unknown'}\n"
                    f"ARR: ${customer.arr:,.2f}\n"
                    f"Health score: {customer.health_score}/100\n"
                    f"Health status: {customer.health_status.value if customer.health_status else 'unknown'}\n\n"
                    f"Trigger signal:\n{json.dumps(play.trigger_signal, indent=2, default=str)}"
                )
                raw = ask_claude(_PLAY_EXECUTION_PROMPT, user_prompt)
                comm_data = json.loads(raw)
                analysis_source = "claude"
            except Exception as exc:
                logger.warning("Claude play execution failed, using template: %s", exc)
                comm_data = _template_communication(play, customer)
                analysis_source = "template_fallback"
        else:
            comm_data = _template_communication(play, customer)
            analysis_source = "template"

        # Persist communication
        comm = Communication(
            customer_id=customer.id,
            play_id=play.id,
            channel=comm_data.get("channel", "email"),
            subject=comm_data.get("subject", f"[Scaled] {play.play_type.value} for {customer.company}"),
            body=comm_data.get("body", ""),
            generated_by=analysis_source,
            sent_at=now,
        )
        session.add(comm)

        # Mark play completed
        play.status = PlayStatus.COMPLETED
        play.executed_at = now
        play.result = {
            "communication_channel": comm_data.get("channel", "email"),
            "communication_subject": comm_data.get("subject", ""),
            "internal_notes": comm_data.get("internal_notes", ""),
            "urgency": comm_data.get("urgency", "medium"),
            "analysis_source": analysis_source,
        }

        session.commit()
        return _serialize_play(play, customer)

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def skip_play(play_id: int, reason: str) -> dict[str, Any]:
    """Skip a play with a reason."""
    session = get_session()
    try:
        play = session.query(Play).filter(Play.id == play_id).first()
        if not play:
            return {"error": f"Play {play_id} not found"}

        if play.status not in (PlayStatus.PENDING, PlayStatus.EXECUTING):
            return {"error": f"Play {play_id} is already {play.status.value}"}

        play.status = PlayStatus.SKIPPED
        play.executed_at = utcnow()
        play.result = {"skipped_reason": reason}

        session.commit()

        customer = session.query(Customer).filter(Customer.id == play.customer_id).first()
        return _serialize_play(play, customer)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_play_queue() -> list[dict[str, Any]]:
    """All pending plays, sorted by priority (critical customers first, then by ARR)."""
    session = get_session()
    try:
        plays = (
            session.query(Play, Customer)
            .join(Customer, Play.customer_id == Customer.id)
            .filter(Play.status == PlayStatus.PENDING)
            .all()
        )

        # Sort: health priority (critical first), then ARR descending
        sorted_plays = sorted(
            plays,
            key=lambda pc: (
                _HEALTH_PRIORITY.get(pc[1].health_status, 3),
                -(pc[1].arr or 0.0),
            ),
        )

        return [_serialize_play(p, c) for p, c in sorted_plays]
    finally:
        session.close()


def get_play_history(customer_id: int | None = None) -> list[dict[str, Any]]:
    """Play history, optionally filtered by customer."""
    session = get_session()
    try:
        query = (
            session.query(Play, Customer)
            .join(Customer, Play.customer_id == Customer.id)
        )
        if customer_id is not None:
            query = query.filter(Play.customer_id == customer_id)

        plays = (
            query
            .order_by(Play.created_at.desc())
            .limit(100)
            .all()
        )

        return [_serialize_play(p, c) for p, c in plays]
    finally:
        session.close()


# ── Template fallback (no Claude API key) ────────────────────────────────


_PLAY_TEMPLATES: dict[str, dict[str, str]] = {
    PlayType.BURN_RATE_ALERT.value: {
        "subject": "Your Anthropic API usage is trending above commitment",
        "body": (
            "Hi {name},\n\n"
            "We noticed your projected monthly spend is on track to exceed your "
            "commitment level. We'd love to help you optimize your usage — would "
            "you be open to a quick call to review your token patterns?\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Burn rate alert triggered automatically",
        "urgency": "high",
    },
    PlayType.CHURN_RISK.value: {
        "subject": "Checking in — how can we help?",
        "body": (
            "Hi {name},\n\n"
            "We've noticed some changes in your usage patterns and wanted to "
            "check in. Is there anything we can help with? We're here to make "
            "sure you're getting the most value from Claude.\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Churn risk — health score dropped significantly",
        "urgency": "critical",
    },
    PlayType.EXPANSION_SIGNAL.value: {
        "subject": "Great to see your Claude usage growing!",
        "body": (
            "Hi {name},\n\n"
            "Your team's usage of Claude has been growing impressively. As you "
            "scale, there are enterprise features and volume discounts that "
            "might be a good fit. Want to explore?\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Expansion signal — strong MoM growth with healthy status",
        "urgency": "medium",
    },
    PlayType.ONBOARDING_NUDGE.value: {
        "subject": "Need help with your next step on Claude?",
        "body": (
            "Hi {name},\n\n"
            "We noticed you might be ready for the next step in getting set up "
            "with Claude. Our team is here to help you move forward — would a "
            "quick walkthrough be useful?\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Onboarding stall detected",
        "urgency": "medium",
    },
    PlayType.REACTIVATION.value: {
        "subject": "We miss you — here's what's new with Claude",
        "body": (
            "Hi {name},\n\n"
            "It's been a while since your last Claude API call. A lot has "
            "improved — want a quick re-onboarding session to see what's new?\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Reactivation — no usage in 14+ days",
        "urgency": "high",
    },
    PlayType.TOKEN_OPTIMIZATION.value: {
        "subject": "Save on your Claude API costs with model routing",
        "body": (
            "Hi {name},\n\n"
            "We've identified an opportunity to reduce your API costs by routing "
            "some workloads to more cost-effective models. Would you like to "
            "review the recommendations together?\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Heavy Opus usage detected — optimization opportunity",
        "urgency": "medium",
    },
    PlayType.INCIDENT_OUTREACH.value: {
        "subject": "Update on recent service disruption",
        "body": (
            "Hi {name},\n\n"
            "We're reaching out about the recent service disruption that may "
            "have impacted your workflows. We take reliability seriously and "
            "want to make sure you're back on track.\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Incident impact outreach",
        "urgency": "high",
    },
    PlayType.MILESTONE_CELEBRATION.value: {
        "subject": "Congratulations on your Claude milestone!",
        "body": (
            "Hi {name},\n\n"
            "Your team just hit an impressive milestone with Claude. "
            "Congratulations! We love seeing the impact you're making.\n\n"
            "Best,\nAnthropic Customer Success"
        ),
        "channel": "email",
        "internal_notes": "Milestone celebration",
        "urgency": "low",
    },
}


def _template_communication(play: Play, customer: Customer) -> dict[str, str]:
    """Generate a template-based communication when Claude is unavailable."""
    template = _PLAY_TEMPLATES.get(
        play.play_type.value,
        {
            "subject": f"Update from Anthropic — {play.play_type.value.replace('_', ' ').title()}",
            "body": f"Hi {customer.name},\n\nWe'd like to connect about your Claude usage.\n\nBest,\nAnthropic Customer Success",
            "channel": "email",
            "internal_notes": f"Auto-generated for {play.play_type.value}",
            "urgency": "medium",
        },
    )
    return {
        k: v.format(name=customer.name) if isinstance(v, str) else v
        for k, v in template.items()
    }
