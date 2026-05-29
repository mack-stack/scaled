"""
Incident Monitor — create, resolve, and track active incidents.
"""

from scaled.core.time import utcnow
from scaled.db.models import (
    get_session, Incident, IncidentSeverity,
)
from scaled.modules.incident_response.engine import assess_incident_impact


def create_incident(
    title: str,
    description: str,
    severity: str,
    affected_services: list[str] | None = None,
    affected_models: list[str] | None = None,
    status_page_url: str | None = None,
) -> dict:
    """Create a new incident and return its details."""
    session = get_session()
    try:
        incident = Incident(
            title=title,
            description=description,
            severity=IncidentSeverity(severity),
            started_at=utcnow(),
            affected_services=affected_services or [],
            affected_models=affected_models or [],
            status_page_url=status_page_url,
            is_active=True,
        )
        session.add(incident)
        session.commit()

        return {
            "id": incident.id,
            "title": incident.title,
            "description": incident.description,
            "severity": incident.severity.value,
            "started_at": incident.started_at.isoformat(),
            "affected_services": incident.affected_services,
            "affected_models": incident.affected_models,
            "status_page_url": incident.status_page_url,
            "is_active": incident.is_active,
        }
    finally:
        session.close()


def resolve_incident(incident_id: int) -> dict:
    """Mark an incident as resolved with a resolution timestamp."""
    session = get_session()
    try:
        incident = session.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return {"error": "Incident not found", "incident_id": incident_id}

        if not incident.is_active:
            return {
                "error": "Incident is already resolved",
                "incident_id": incident_id,
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            }

        incident.is_active = False
        incident.resolved_at = utcnow()
        session.commit()

        return {
            "id": incident.id,
            "title": incident.title,
            "severity": incident.severity.value if incident.severity else None,
            "started_at": incident.started_at.isoformat() if incident.started_at else None,
            "resolved_at": incident.resolved_at.isoformat(),
            "is_active": incident.is_active,
            "duration_minutes": round(
                (incident.resolved_at - incident.started_at).total_seconds() / 60, 1
            ) if incident.started_at else None,
        }
    finally:
        session.close()


def get_active_incidents() -> dict:
    """List all active incidents with impact summaries."""
    session = get_session()
    try:
        incidents = session.query(Incident).filter(Incident.is_active == True).all()

        results = []
        for inc in incidents:
            # Get a lightweight impact summary
            assessment = assess_incident_impact(inc.id)
            impact_summary = {}
            if "error" not in assessment:
                impact_summary = {
                    "total_customers": assessment["total_customers"],
                    "impacted_customers": assessment["impacted_customers"],
                    "tiers": {
                        tier: data["count"]
                        for tier, data in assessment.get("tiers", {}).items()
                    },
                }

            results.append({
                "id": inc.id,
                "title": inc.title,
                "description": inc.description,
                "severity": inc.severity.value if inc.severity else None,
                "started_at": inc.started_at.isoformat() if inc.started_at else None,
                "affected_services": inc.affected_services or [],
                "affected_models": inc.affected_models or [],
                "status_page_url": inc.status_page_url,
                "is_active": inc.is_active,
                "impact_summary": impact_summary,
            })

        return {"active_incidents": results, "total": len(results)}
    finally:
        session.close()


def get_all_incidents() -> dict:
    """List all incidents — active and resolved."""
    session = get_session()
    try:
        incidents = session.query(Incident).order_by(Incident.started_at.desc()).all()

        results = []
        for inc in incidents:
            results.append({
                "id": inc.id,
                "title": inc.title,
                "description": inc.description,
                "severity": inc.severity.value if inc.severity else None,
                "started_at": inc.started_at.isoformat() if inc.started_at else None,
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
                "affected_services": inc.affected_services or [],
                "affected_models": inc.affected_models or [],
                "status_page_url": inc.status_page_url,
                "is_active": inc.is_active,
            })

        return {"incidents": results, "total": len(results)}
    finally:
        session.close()
