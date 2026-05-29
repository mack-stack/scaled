"""
Incident Response Engine — Module 2 of Scaled.

Turns reactive incident firefighting into orchestrated, personalized response.
Cross-references incident impact with customer usage patterns to generate
tiered, context-aware communications via Claude.
"""

import json
from datetime import timedelta

from sqlalchemy import func

from scaled.core.config import get_settings
from scaled.core.claude import ask_claude
from scaled.core.time import utcnow
from scaled.db.models import (
    get_session, Customer, UsageEvent, Incident, Play, Communication,
    PlayType, PlayStatus, IncidentSeverity,
)


# --- Impact Assessment ---

def _get_customer_usage_profile(session, customer_id: int, days: int = 30) -> dict:
    """Build a usage profile for a customer over the last N days."""
    cutoff = utcnow() - timedelta(days=days)

    # Usage by model
    model_usage = session.query(
        UsageEvent.model,
        func.sum(UsageEvent.cost).label("cost"),
        func.count(UsageEvent.id).label("events"),
    ).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).group_by(UsageEvent.model).all()

    # Usage by endpoint/service
    service_usage = session.query(
        UsageEvent.endpoint,
        func.sum(UsageEvent.cost).label("cost"),
        func.count(UsageEvent.id).label("events"),
    ).filter(
        UsageEvent.customer_id == customer_id,
        UsageEvent.timestamp >= cutoff,
    ).group_by(UsageEvent.endpoint).all()

    total_cost = sum(m.cost or 0 for m in model_usage)
    total_events = sum(m.events or 0 for m in model_usage)

    return {
        "models": {m.model: {"cost": float(m.cost or 0), "events": m.events} for m in model_usage},
        "services": {s.endpoint: {"cost": float(s.cost or 0), "events": s.events} for s in service_usage},
        "total_cost": float(total_cost),
        "total_events": total_events,
    }


def _compute_impact_score(
    usage_profile: dict,
    affected_services: list[str],
    affected_models: list[str],
    customer_health_score: int,
    customer_arr: float,
) -> dict:
    """
    Compute an impact score (0-100) for a customer given an incident's blast radius.

    Factors:
    - % of usage hitting affected services/models (0-40 points)
    - Spend level / ARR (0-30 points)
    - Current health status — already at-risk customers hit harder (0-30 points)
    """
    total_cost = usage_profile["total_cost"]
    total_events = usage_profile["total_events"]

    if total_events == 0:
        return {"score": 0, "tier": "not_impacted", "affected_pct": 0.0, "details": "No recent usage"}

    # Affected usage percentage (by cost and by event count)
    affected_cost = 0.0
    affected_events = 0

    for model, data in usage_profile["models"].items():
        if model in affected_models:
            affected_cost += data["cost"]
            affected_events += data["events"]

    for service, data in usage_profile["services"].items():
        if service in affected_services:
            affected_cost += data["cost"]
            affected_events += data["events"]

    # Deduplicate: cap at total (a single event can match both model and service)
    affected_cost = min(affected_cost, total_cost)
    affected_events = min(affected_events, total_events)

    affected_pct = (affected_cost / total_cost * 100) if total_cost > 0 else 0.0

    # Usage overlap score (0-40)
    usage_score = min(40, affected_pct * 0.4)

    # Spend/ARR score (0-30) — higher ARR = more impact weight
    if customer_arr >= 500_000:
        spend_score = 30
    elif customer_arr >= 100_000:
        spend_score = 25
    elif customer_arr >= 50_000:
        spend_score = 20
    elif customer_arr >= 10_000:
        spend_score = 15
    elif customer_arr >= 1_000:
        spend_score = 10
    else:
        spend_score = 5

    # Health vulnerability score (0-30) — unhealthy customers feel it more
    health_vulnerability = max(0, 30 - (customer_health_score * 0.3))

    total_score = round(usage_score + spend_score + health_vulnerability)
    total_score = min(100, max(0, total_score))

    # Tier assignment
    if affected_pct == 0:
        tier = "not_impacted"
        total_score = 0
    elif total_score >= 70:
        tier = "critical_impact"
    elif total_score >= 50:
        tier = "high_impact"
    elif total_score >= 25:
        tier = "moderate_impact"
    else:
        tier = "low_impact"

    return {
        "score": total_score,
        "tier": tier,
        "affected_pct": round(affected_pct, 1),
        "affected_cost": round(affected_cost, 2),
        "affected_events": affected_events,
        "details": f"{affected_pct:.0f}% of usage on affected services/models, ARR ${customer_arr:,.0f}",
    }


def assess_incident_impact(incident_id: int) -> dict:
    """
    For a given incident, analyze which customers are impacted and how severely.

    Returns the full impact assessment with customer lists per tier.
    """
    session = get_session()
    try:
        incident = session.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return {"error": "Incident not found", "incident_id": incident_id}

        affected_services = incident.affected_services or []
        affected_models = incident.affected_models or []

        customers = session.query(Customer).all()

        tiers = {
            "critical_impact": [],
            "high_impact": [],
            "moderate_impact": [],
            "low_impact": [],
            "not_impacted": [],
        }
        all_assessments = []

        for customer in customers:
            usage_profile = _get_customer_usage_profile(session, customer.id)
            impact = _compute_impact_score(
                usage_profile=usage_profile,
                affected_services=affected_services,
                affected_models=affected_models,
                customer_health_score=customer.health_score or 50,
                customer_arr=customer.arr or 0.0,
            )

            assessment = {
                "customer_id": customer.id,
                "customer_name": customer.name,
                "company": customer.company,
                "email": customer.email,
                "segment": customer.segment.value if customer.segment else None,
                "plan_tier": customer.plan_tier.value if customer.plan_tier else None,
                "health_status": customer.health_status.value if customer.health_status else None,
                "health_score": customer.health_score,
                "arr": customer.arr,
                "impact_score": impact["score"],
                "impact_tier": impact["tier"],
                "affected_pct": impact["affected_pct"],
                "affected_cost": impact.get("affected_cost", 0),
                "affected_events": impact.get("affected_events", 0),
                "details": impact["details"],
                "usage_profile": usage_profile,
            }

            tiers[impact["tier"]].append(assessment)
            all_assessments.append(assessment)

        impacted_count = sum(len(v) for k, v in tiers.items() if k != "not_impacted")

        return {
            "incident_id": incident_id,
            "incident_title": incident.title,
            "incident_severity": incident.severity.value if incident.severity else None,
            "affected_services": affected_services,
            "affected_models": affected_models,
            "total_customers": len(customers),
            "impacted_customers": impacted_count,
            "tiers": {
                tier: {
                    "count": len(customers_in_tier),
                    "customers": customers_in_tier,
                }
                for tier, customers_in_tier in tiers.items()
            },
        }
    finally:
        session.close()


# --- Communication Generation ---

INCIDENT_COMMS_SYSTEM_PROMPT = """\
You are a customer success communication specialist at Anthropic. You write incident \
communications that are transparent, empathetic, and specific to each customer's context.

Anthropic's brand is built on trust and safety. When incidents happen, customers need \
to know: what happened, what's being done, and what they should do. Never minimize the \
issue — acknowledge impact directly.

You will receive:
- Incident details (what broke, severity, affected services/models)
- Customer context (their usage patterns, which services they depend on, their spend)
- The impact tier (how severely this customer is affected)

Generate a JSON response with "subject" and "body" fields. The body should be in plain \
text with clear formatting (use line breaks, not HTML).

Tier-specific guidance:
- critical_impact: Detailed technical explanation, specific remediation/workaround steps, \
  executive summary of what went wrong, timeline for resolution, offer a live call with \
  their account team. Reference their specific usage numbers.
- high_impact: Clear explanation of what happened, what Anthropic is doing to fix it, \
  specific workaround steps relevant to their usage. Reference their affected services.
- moderate_impact: Brief summary of the issue, link to status page, note that their \
  primary workflows may see minor disruption.
- low_impact: Short FYI notification, minimal disruption expected, link to status page \
  for updates.

Always reference the customer's specific usage context (e.g., "Your team uses Claude Code \
for approximately X% of your API calls...") rather than generic template language.\
"""


def _build_comms_prompt(incident: Incident, tier: str, customers: list[dict]) -> str:
    """Build a user prompt for Claude to generate comms for a batch of customers in a tier."""
    customer_summaries = []
    for c in customers:
        profile = c.get("usage_profile", {})
        models_used = list(profile.get("models", {}).keys())
        services_used = list(profile.get("services", {}).keys())
        customer_summaries.append({
            "customer_id": c["customer_id"],
            "name": c["customer_name"],
            "company": c["company"],
            "affected_pct": c["affected_pct"],
            "affected_cost": c.get("affected_cost", 0),
            "arr": c["arr"],
            "health_score": c["health_score"],
            "models_used": models_used,
            "services_used": services_used,
            "plan_tier": c["plan_tier"],
        })

    prompt = f"""Incident Details:
- Title: {incident.title}
- Description: {incident.description}
- Severity: {incident.severity.value if incident.severity else 'unknown'}
- Affected Services: {json.dumps(incident.affected_services or [])}
- Affected Models: {json.dumps(incident.affected_models or [])}
- Status Page: {incident.status_page_url or 'https://status.anthropic.com'}
- Started At: {incident.started_at.isoformat() if incident.started_at else 'unknown'}
- Currently Active: {incident.is_active}

Impact Tier: {tier}

Customers in this tier ({len(customer_summaries)} total):
{json.dumps(customer_summaries, indent=2)}

Generate personalized communications for EACH customer. Return valid JSON — an array of objects, \
each with: "customer_id" (int), "subject" (string), "body" (string).

Make each message specific to that customer's usage context. Do not use identical copy across \
customers unless their usage profiles are truly identical."""

    return prompt


def generate_incident_comms(incident_id: int) -> dict:
    """
    Call Claude to generate personalized communications per impact tier.

    Saves generated comms to Communication table linked to Play (INCIDENT_OUTREACH type).
    Returns all generated comms organized by tier.
    """
    settings = get_settings()

    # First, get the impact assessment
    assessment = assess_incident_impact(incident_id)
    if "error" in assessment:
        return assessment

    # Check if Claude API key is available
    if not settings.anthropic_api_key:
        return {
            "incident_id": incident_id,
            "warning": "Claude API key not configured — returning impact assessment only, no comms generated",
            "assessment": assessment,
            "comms": {},
        }

    session = get_session()
    try:
        incident = session.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return {"error": "Incident not found"}

        all_comms = {}
        tiers_to_contact = ["critical_impact", "high_impact", "moderate_impact", "low_impact"]

        for tier in tiers_to_contact:
            tier_data = assessment["tiers"].get(tier, {})
            customers_in_tier = tier_data.get("customers", [])
            if not customers_in_tier:
                all_comms[tier] = []
                continue

            # Generate comms via Claude
            prompt = _build_comms_prompt(incident, tier, customers_in_tier)
            try:
                raw_response = ask_claude(INCIDENT_COMMS_SYSTEM_PROMPT, prompt)
                # Parse the JSON response from Claude
                # Handle potential markdown code fences
                cleaned = raw_response.strip()
                if cleaned.startswith("```"):
                    # Strip code fences
                    lines = cleaned.split("\n")
                    lines = lines[1:]  # remove opening fence
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    cleaned = "\n".join(lines)
                comms_data = json.loads(cleaned)
            except (json.JSONDecodeError, Exception) as e:
                all_comms[tier] = [{
                    "error": f"Failed to parse Claude response: {str(e)}",
                    "raw_response": raw_response[:500] if 'raw_response' in dir() else str(e),
                }]
                continue

            tier_comms = []
            for comm in comms_data:
                customer_id = comm.get("customer_id")
                if not customer_id:
                    continue

                # Create a Play for this customer
                play = Play(
                    customer_id=customer_id,
                    play_type=PlayType.INCIDENT_OUTREACH,
                    status=PlayStatus.COMPLETED,
                    trigger_signal={
                        "incident_id": incident_id,
                        "impact_tier": tier,
                    },
                    created_at=utcnow(),
                    executed_at=utcnow(),
                    result={"tier": tier, "incident_title": incident.title},
                )
                session.add(play)
                session.flush()  # get play.id

                # Create Communication record
                communication = Communication(
                    customer_id=customer_id,
                    play_id=play.id,
                    channel="email",
                    subject=comm.get("subject", f"[Anthropic] Incident: {incident.title}"),
                    body=comm.get("body", ""),
                    generated_by="claude",
                )
                session.add(communication)
                session.flush()

                tier_comms.append({
                    "communication_id": communication.id,
                    "play_id": play.id,
                    "customer_id": customer_id,
                    "subject": communication.subject,
                    "body": communication.body,
                    "tier": tier,
                })

            all_comms[tier] = tier_comms

        session.commit()

        total_comms = sum(len(v) for v in all_comms.values() if isinstance(v, list))
        return {
            "incident_id": incident_id,
            "incident_title": incident.title,
            "total_comms_generated": total_comms,
            "comms_by_tier": all_comms,
            "assessment_summary": {
                "total_customers": assessment["total_customers"],
                "impacted_customers": assessment["impacted_customers"],
                "tiers": {
                    tier: data["count"]
                    for tier, data in assessment["tiers"].items()
                },
            },
        }
    finally:
        session.close()


# --- Dashboard ---

def get_incident_dashboard(incident_id: int) -> dict:
    """
    Returns a complete view: incident details, impact breakdown by tier,
    comms generated/sent, customer-level detail.
    """
    session = get_session()
    try:
        incident = session.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return {"error": "Incident not found", "incident_id": incident_id}

        # Get impact assessment
        assessment = assess_incident_impact(incident_id)

        # Get all plays for this incident
        all_incident_plays = session.query(Play).filter(
            Play.play_type == PlayType.INCIDENT_OUTREACH,
        ).all()
        plays = [
            p for p in all_incident_plays
            if p.trigger_signal and p.trigger_signal.get("incident_id") == incident_id
        ]

        # Get all communications linked to those plays
        play_ids = [p.id for p in plays]
        comms = []
        if play_ids:
            comms_query = session.query(Communication).filter(
                Communication.play_id.in_(play_ids)
            ).all()
            comms = [
                {
                    "id": c.id,
                    "customer_id": c.customer_id,
                    "play_id": c.play_id,
                    "channel": c.channel,
                    "subject": c.subject,
                    "body": c.body[:200] + "..." if c.body and len(c.body) > 200 else c.body,
                    "generated_by": c.generated_by,
                    "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                    "opened_at": c.opened_at.isoformat() if c.opened_at else None,
                    "clicked_at": c.clicked_at.isoformat() if c.clicked_at else None,
                }
                for c in comms_query
            ]

        comms_sent = sum(1 for c in comms if c["sent_at"])
        comms_opened = sum(1 for c in comms if c["opened_at"])

        return {
            "incident": {
                "id": incident.id,
                "title": incident.title,
                "description": incident.description,
                "severity": incident.severity.value if incident.severity else None,
                "started_at": incident.started_at.isoformat() if incident.started_at else None,
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
                "affected_services": incident.affected_services or [],
                "affected_models": incident.affected_models or [],
                "status_page_url": incident.status_page_url,
                "is_active": incident.is_active,
            },
            "impact": {
                "total_customers": assessment.get("total_customers", 0),
                "impacted_customers": assessment.get("impacted_customers", 0),
                "tiers": {
                    tier: {
                        "count": data["count"],
                        "customers": [
                            {
                                "customer_id": c["customer_id"],
                                "company": c["company"],
                                "impact_score": c["impact_score"],
                                "affected_pct": c["affected_pct"],
                                "arr": c["arr"],
                            }
                            for c in data["customers"]
                        ],
                    }
                    for tier, data in assessment.get("tiers", {}).items()
                },
            },
            "communications": {
                "total_generated": len(comms),
                "total_sent": comms_sent,
                "total_opened": comms_opened,
                "items": comms,
            },
        }
    finally:
        session.close()
