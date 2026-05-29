"""
Incident Response API routes.

Endpoints for creating/resolving incidents, assessing impact,
generating personalized comms, and viewing the incident dashboard.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from scaled.modules.incident_response.monitor import (
    create_incident,
    resolve_incident,
    get_active_incidents,
    get_all_incidents,
)
from scaled.modules.incident_response.engine import (
    assess_incident_impact,
    generate_incident_comms,
    get_incident_dashboard,
)
from scaled.db.models import get_session, Communication, Play, PlayType

router = APIRouter()


# --- Request schemas ---

class CreateIncidentRequest(BaseModel):
    title: str
    description: str
    severity: str  # low, medium, high, critical
    affected_services: list[str] = []
    affected_models: list[str] = []
    status_page_url: str | None = None


# --- Routes ---

@router.get("")
def list_incidents():
    """List all incidents (active and resolved)."""
    return get_all_incidents()


@router.get("/active")
def list_active_incidents():
    """Active incidents only with impact summaries."""
    return get_active_incidents()


@router.post("")
def create_new_incident(req: CreateIncidentRequest):
    """Create a new incident."""
    return create_incident(
        title=req.title,
        description=req.description,
        severity=req.severity,
        affected_services=req.affected_services,
        affected_models=req.affected_models,
        status_page_url=req.status_page_url,
    )


@router.put("/{incident_id}/resolve")
def resolve_existing_incident(incident_id: int):
    """Resolve an incident and trigger follow-up."""
    return resolve_incident(incident_id)


@router.get("/{incident_id}")
def incident_dashboard(incident_id: int):
    """Full incident dashboard — details, impact breakdown, comms status."""
    return get_incident_dashboard(incident_id)


@router.post("/{incident_id}/assess")
def trigger_impact_assessment(incident_id: int):
    """Trigger impact assessment for an incident."""
    return assess_incident_impact(incident_id)


@router.post("/{incident_id}/comms")
def trigger_comms_generation(incident_id: int):
    """Generate personalized communications for all impacted customers."""
    return generate_incident_comms(incident_id)


@router.get("/{incident_id}/comms")
def get_incident_comms(incident_id: int):
    """Get all generated communications for this incident."""
    session = get_session()
    try:
        # Find plays linked to this incident
        all_incident_plays = session.query(Play).filter(
            Play.play_type == PlayType.INCIDENT_OUTREACH,
        ).all()
        plays = [
            p for p in all_incident_plays
            if p.trigger_signal and p.trigger_signal.get("incident_id") == incident_id
        ]

        play_ids = [p.id for p in plays]
        if not play_ids:
            return {"incident_id": incident_id, "communications": [], "total": 0}

        comms = session.query(Communication).filter(
            Communication.play_id.in_(play_ids)
        ).all()

        results = [
            {
                "id": c.id,
                "customer_id": c.customer_id,
                "play_id": c.play_id,
                "channel": c.channel,
                "subject": c.subject,
                "body": c.body,
                "generated_by": c.generated_by,
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "opened_at": c.opened_at.isoformat() if c.opened_at else None,
                "clicked_at": c.clicked_at.isoformat() if c.clicked_at else None,
            }
            for c in comms
        ]

        return {"incident_id": incident_id, "communications": results, "total": len(results)}
    finally:
        session.close()
