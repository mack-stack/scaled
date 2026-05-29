"""
Onboarding Autopilot — Lifecycle State Machine

Deterministic stage evaluation based on actual usage data.
Claude generates messaging only — never decides stage placement.
"""

import json
import logging
from datetime import timedelta

from sqlalchemy import func

from scaled.core.claude import ask_claude
from scaled.core.config import get_settings
from scaled.core.time import utcnow
from scaled.db.models import (
    Communication,
    Customer,
    OnboardingStage,
    Play,
    PlayStatus,
    PlayType,
    UsageEvent,
    get_session,
)

logger = logging.getLogger(__name__)

# Ordered stages for comparison
STAGE_ORDER = [
    OnboardingStage.SIGNED_UP,
    OnboardingStage.API_KEY_CREATED,
    OnboardingStage.FIRST_API_CALL,
    OnboardingStage.FIRST_WORKFLOW,
    OnboardingStage.INTEGRATED,
    OnboardingStage.SCALING,
    OnboardingStage.CHAMPION,
]

# Days at stage before considered stalled
STALL_THRESHOLDS = {
    OnboardingStage.SIGNED_UP: 7,
    OnboardingStage.API_KEY_CREATED: 10,
    OnboardingStage.FIRST_API_CALL: 14,
    OnboardingStage.FIRST_WORKFLOW: 21,
    OnboardingStage.INTEGRATED: 30,
    OnboardingStage.SCALING: 60,
    OnboardingStage.CHAMPION: None,  # never stalls — they made it
}

ONBOARDING_SYSTEM_PROMPT = """You are a technical customer success advisor at Anthropic.
You help customers get the most value from Claude — the API, Claude Code, prompt caching,
the Batch API, extended context windows, Projects, MCP connectors, and more.

Tone: helpful technical advisor, NOT a salesperson. Be specific and actionable.
Always include ONE quantified benefit per recommendation (e.g. "save 50% on batch processing",
"reduce latency 3x with Haiku", "cut classification costs 67% by switching from Sonnet to Haiku").

For enterprise customers: mention Team/Enterprise features, SSO, admin console, usage dashboards.
For self-serve/API customers: focus on API best practices, cost optimization, model selection.
For small business customers: reference agentic workflows, connectors (QuickBooks, HubSpot, Slack, etc.).

Never be generic. Reference what the customer IS using and what they're NOT using yet."""


def _stage_index(stage: OnboardingStage) -> int:
    return STAGE_ORDER.index(stage)


def _get_usage_profile(session, customer_id: int, days: int = 30) -> dict:
    """Build a usage profile for stage evaluation and Claude context."""
    cutoff = utcnow() - timedelta(days=days)

    total_events = session.query(func.count(UsageEvent.id)).filter(
        UsageEvent.customer_id == customer_id,
    ).scalar() or 0

    recent_events = session.query(func.count(UsageEvent.id)).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).scalar() or 0

    models_used = session.query(UsageEvent.model).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).distinct().all()
    models_used = [m[0] for m in models_used]

    endpoints_used = session.query(UsageEvent.endpoint).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).distinct().all()
    endpoints_used = [e[0] for e in endpoints_used]

    total_spend = session.query(func.sum(UsageEvent.cost)).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).scalar() or 0.0

    total_cache_hits = session.query(func.sum(UsageEvent.cache_hits)).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).scalar() or 0

    # Active days in the period
    active_days = session.query(
        func.count(func.distinct(func.date(UsageEvent.timestamp)))
    ).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).scalar() or 0

    # Daily average spend
    daily_avg_spend = total_spend / max(active_days, 1)

    return {
        "total_events": total_events,
        "recent_events": recent_events,
        "models_used": models_used,
        "endpoints_used": endpoints_used,
        "total_spend_30d": round(total_spend, 2),
        "daily_avg_spend": round(daily_avg_spend, 2),
        "active_days_30d": active_days,
        "uses_cache": total_cache_hits > 0,
        "uses_batch": "batch" in endpoints_used,
        "uses_claude_code": "claude_code" in endpoints_used,
        "model_count": len(models_used),
        "endpoint_count": len(endpoints_used),
    }


def _compute_stage(profile: dict) -> OnboardingStage:
    """Deterministic stage computation from usage profile."""
    total = profile["total_events"]
    recent = profile["recent_events"]
    models = profile["model_count"]
    endpoints = profile["endpoint_count"]
    active_days = profile["active_days_30d"]
    spend = profile["total_spend_30d"]
    uses_batch = profile["uses_batch"]
    uses_cache = profile["uses_cache"]

    if total == 0:
        return OnboardingStage.SIGNED_UP

    if total < 10:
        return OnboardingStage.API_KEY_CREATED

    if recent < 50 or models <= 1:
        return OnboardingStage.FIRST_API_CALL

    if active_days < 10 or endpoints <= 1:
        return OnboardingStage.FIRST_WORKFLOW

    # Consistent daily usage, multiple models, meaningful spend
    if active_days >= 20 and models >= 2 and spend >= 100:
        # Check for scaling indicators
        if (uses_batch or uses_cache) and spend >= 500:
            # Check for champion indicators
            if spend >= 2000 and active_days >= 25 and models >= 3:
                return OnboardingStage.CHAMPION
            return OnboardingStage.SCALING
        return OnboardingStage.INTEGRATED

    return OnboardingStage.FIRST_WORKFLOW


def evaluate_customer_stage(customer_id: int) -> dict:
    """
    Evaluate a customer's onboarding stage based on actual behavior.
    Returns transition info if stage changed, or current status if not.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found", "customer_id": customer_id}

        profile = _get_usage_profile(session, customer_id)
        computed_stage = _compute_stage(profile)
        previous_stage = customer.onboarding_stage

        result = {
            "customer_id": customer_id,
            "company": customer.company,
            "previous_stage": previous_stage.value if previous_stage else None,
            "computed_stage": computed_stage.value,
            "changed": False,
            "usage_profile": profile,
        }

        if computed_stage != previous_stage:
            # Only advance forward, never regress (temporary dips shouldn't demote)
            if previous_stage is None or _stage_index(computed_stage) > _stage_index(previous_stage):
                customer.onboarding_stage = computed_stage
                session.commit()
                result["changed"] = True
                result["transition"] = {
                    "from": previous_stage.value if previous_stage else None,
                    "to": computed_stage.value,
                }
                logger.info(
                    f"Customer {customer_id} ({customer.company}) advanced: "
                    f"{previous_stage.value if previous_stage else 'none'} → {computed_stage.value}"
                )

        return result
    finally:
        session.close()


def generate_next_steps(customer_id: int) -> dict:
    """Generate Claude-powered next steps personalized to this customer's journey."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found", "customer_id": customer_id}

        profile = _get_usage_profile(session, customer_id)

        # How long at current stage
        # Use last_active as a rough proxy; in production we'd track stage entry time
        days_at_stage = (utcnow() - customer.last_active).days if customer.last_active else 0

        # All available Anthropic features for gap analysis
        all_models = {"claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-3-5", "claude-sonnet-3-5"}
        all_endpoints = {"messages", "batch", "claude_code", "embeddings"}
        unused_models = list(all_models - set(profile["models_used"]))
        unused_endpoints = list(all_endpoints - set(profile["endpoints_used"]))

        user_prompt = f"""Customer profile:
- Company: {customer.company}
- Segment: {customer.segment.value if customer.segment else 'unknown'}
- Plan: {customer.plan_tier.value if customer.plan_tier else 'unknown'}
- Current onboarding stage: {customer.onboarding_stage.value if customer.onboarding_stage else 'signed_up'}
- Days at current stage: {days_at_stage}
- Monthly commitment: ${customer.monthly_commitment}
- Seats: {customer.seats}

Usage (last 30 days):
- Total API events: {profile['recent_events']}
- Models used: {', '.join(profile['models_used']) or 'none'}
- Models NOT used: {', '.join(unused_models)}
- Endpoints used: {', '.join(profile['endpoints_used']) or 'none'}
- Endpoints NOT used: {', '.join(unused_endpoints)}
- 30-day spend: ${profile['total_spend_30d']}
- Active days: {profile['active_days_30d']}/30
- Uses prompt caching: {'yes' if profile['uses_cache'] else 'no'}
- Uses Batch API: {'yes' if profile['uses_batch'] else 'no'}

Generate 3-5 specific, actionable next steps for this customer. For each step:
1. What to do (concrete action, not "explore our docs")
2. Why it matters (quantified benefit)
3. How to start (one-liner code example or link)

Return as JSON array: [{{"action": "...", "benefit": "...", "how": "..."}}]
Only return the JSON array, no other text."""

        settings = get_settings()
        if not settings.anthropic_api_key:
            return {
                "customer_id": customer_id,
                "stage": customer.onboarding_stage.value if customer.onboarding_stage else None,
                "next_steps": [],
                "error": "Anthropic API key not configured — cannot generate next steps",
            }

        raw = ask_claude(ONBOARDING_SYSTEM_PROMPT, user_prompt)

        # Parse Claude's JSON response
        try:
            # Handle markdown code fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                cleaned = cleaned.rsplit("```", 1)[0]
            next_steps = json.loads(cleaned)
        except json.JSONDecodeError:
            next_steps = [{"action": raw, "benefit": "See above", "how": "Contact support"}]

        return {
            "customer_id": customer_id,
            "company": customer.company,
            "stage": customer.onboarding_stage.value if customer.onboarding_stage else None,
            "days_at_stage": days_at_stage,
            "usage_profile": profile,
            "next_steps": next_steps,
        }
    finally:
        session.close()


def check_for_stalls(customer_id: int) -> dict:
    """
    Detect if a customer has stalled at their current stage.
    If stalled, generates an ONBOARDING_NUDGE or REACTIVATION play.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found", "customer_id": customer_id}

        stage = customer.onboarding_stage or OnboardingStage.SIGNED_UP
        threshold = STALL_THRESHOLDS.get(stage)

        if threshold is None:
            return {
                "customer_id": customer_id,
                "stage": stage.value,
                "stalled": False,
                "reason": "Champion stage — no stall threshold",
            }

        # Approximate time at stage using last_active vs now
        # In production, we'd track stage_entered_at explicitly
        days_inactive = (utcnow() - customer.last_active).days if customer.last_active else 999

        if days_inactive < threshold:
            return {
                "customer_id": customer_id,
                "stage": stage.value,
                "stalled": False,
                "days_at_stage": days_inactive,
                "threshold": threshold,
            }

        # Customer is stalled — determine play type
        play_type = (
            PlayType.REACTIVATION
            if stage in (OnboardingStage.SIGNED_UP, OnboardingStage.API_KEY_CREATED)
            else PlayType.ONBOARDING_NUDGE
        )

        profile = _get_usage_profile(session, customer_id)

        # Create the play
        play = Play(
            customer_id=customer_id,
            play_type=play_type,
            status=PlayStatus.PENDING,
            trigger_signal={
                "type": "stall_detected",
                "stage": stage.value,
                "days_at_stage": days_inactive,
                "threshold": threshold,
            },
        )
        session.add(play)
        session.flush()  # get play.id

        # Generate the nudge email with Claude
        settings = get_settings()
        email_body = None
        email_subject = None

        if settings.anthropic_api_key:
            nudge_prompt = f"""A customer has stalled during onboarding. Write a short, helpful email
to re-engage them. Be empathetic, not pushy. Offer ONE specific thing they can try.

Customer: {customer.name} at {customer.company}
Segment: {customer.segment.value if customer.segment else 'unknown'}
Plan: {customer.plan_tier.value if customer.plan_tier else 'unknown'}
Stage: {stage.value}
Days stuck: {days_inactive}
Usage so far: {profile['total_events']} total events, models: {', '.join(profile['models_used']) or 'none'}

Return JSON: {{"subject": "...", "body": "..."}}
The body should be plain text, 3-5 short paragraphs. Sign off as "The Anthropic Team".
Only return the JSON, no other text."""

            try:
                raw = ask_claude(ONBOARDING_SYSTEM_PROMPT, nudge_prompt)
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    cleaned = cleaned.rsplit("```", 1)[0]
                email_data = json.loads(cleaned)
                email_subject = email_data.get("subject", "Getting started with Claude")
                email_body = email_data.get("body", "")
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Failed to generate nudge email for customer {customer_id}: {e}")
                email_subject = f"Getting started with Claude — we're here to help"
                email_body = (
                    f"Hi {customer.name},\n\n"
                    f"We noticed you signed up but haven't gotten to the next step yet. "
                    f"We'd love to help you get value from Claude.\n\n"
                    f"— The Anthropic Team"
                )

        if email_body:
            comm = Communication(
                customer_id=customer_id,
                play_id=play.id,
                channel="email",
                subject=email_subject,
                body=email_body,
                generated_by="claude",
            )
            session.add(comm)

        session.commit()

        return {
            "customer_id": customer_id,
            "company": customer.company,
            "stage": stage.value,
            "stalled": True,
            "days_at_stage": days_inactive,
            "threshold": threshold,
            "play_type": play_type.value,
            "play_id": play.id,
            "email_subject": email_subject,
            "email_preview": email_body[:200] + "..." if email_body and len(email_body) > 200 else email_body,
        }
    finally:
        session.close()


def celebrate_milestone(customer_id: int) -> dict:
    """
    Detect and celebrate stage transitions.
    Creates a MILESTONE_CELEBRATION play when a customer advances.
    Call this after evaluate_customer_stage detects a transition.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found", "customer_id": customer_id}

        stage = customer.onboarding_stage or OnboardingStage.SIGNED_UP
        stage_idx = _stage_index(stage)

        # Only celebrate if they're past SIGNED_UP (there's a real achievement)
        if stage_idx == 0:
            return {
                "customer_id": customer_id,
                "stage": stage.value,
                "celebrated": False,
                "reason": "Still at initial stage — nothing to celebrate yet",
            }

        # Check if we already celebrated this stage recently (avoid duplicates)
        recent_celebration = session.query(Play).filter(
            Play.customer_id == customer_id,
            Play.play_type == PlayType.MILESTONE_CELEBRATION,
            Play.created_at >= utcnow() - timedelta(days=1),
        ).first()

        if recent_celebration:
            return {
                "customer_id": customer_id,
                "stage": stage.value,
                "celebrated": False,
                "reason": "Already celebrated within the last 24 hours",
            }

        profile = _get_usage_profile(session, customer_id)

        # Next stage teaser
        next_stage = STAGE_ORDER[stage_idx + 1] if stage_idx + 1 < len(STAGE_ORDER) else None
        next_stage_name = next_stage.value if next_stage else "you're at the top"

        play = Play(
            customer_id=customer_id,
            play_type=PlayType.MILESTONE_CELEBRATION,
            status=PlayStatus.PENDING,
            trigger_signal={
                "type": "stage_advance",
                "new_stage": stage.value,
                "next_stage": next_stage_name,
            },
        )
        session.add(play)
        session.flush()

        # Generate celebration message with Claude
        settings = get_settings()
        email_body = None
        email_subject = None

        if settings.anthropic_api_key:
            celebration_prompt = f"""A customer just reached a new onboarding milestone. Write a short
congratulatory email that:
1. Celebrates their specific achievement
2. Reinforces the value they're getting from Claude
3. Teases what's possible at the next stage

Customer: {customer.name} at {customer.company}
Segment: {customer.segment.value if customer.segment else 'unknown'}
Plan: {customer.plan_tier.value if customer.plan_tier else 'unknown'}
New stage reached: {stage.value}
Next stage: {next_stage_name}
Their usage: {profile['recent_events']} events, models: {', '.join(profile['models_used']) or 'none'}, spend: ${profile['total_spend_30d']}

Return JSON: {{"subject": "...", "body": "..."}}
Body should be plain text, 3-4 short upbeat paragraphs. Sign off as "The Anthropic Team".
Only return the JSON, no other text."""

            try:
                raw = ask_claude(ONBOARDING_SYSTEM_PROMPT, celebration_prompt)
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    cleaned = cleaned.rsplit("```", 1)[0]
                email_data = json.loads(cleaned)
                email_subject = email_data.get("subject", f"Milestone reached: {stage.value}")
                email_body = email_data.get("body", "")
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Failed to generate celebration for customer {customer_id}: {e}")
                email_subject = f"You've reached {stage.value.replace('_', ' ').title()} — nice work!"
                email_body = (
                    f"Hi {customer.name},\n\n"
                    f"Congratulations on reaching the {stage.value.replace('_', ' ')} stage! "
                    f"You're making great progress with Claude.\n\n"
                    f"— The Anthropic Team"
                )

        if email_body:
            comm = Communication(
                customer_id=customer_id,
                play_id=play.id,
                channel="email",
                subject=email_subject,
                body=email_body,
                generated_by="claude",
            )
            session.add(comm)

        session.commit()

        return {
            "customer_id": customer_id,
            "company": customer.company,
            "stage": stage.value,
            "celebrated": True,
            "play_id": play.id,
            "next_stage": next_stage_name,
            "email_subject": email_subject,
            "email_preview": email_body[:200] + "..." if email_body and len(email_body) > 200 else email_body,
        }
    finally:
        session.close()
