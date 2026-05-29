"""Token Health Monitor — batch operations.

Run health checks across all customers or a specific segment,
and return portfolio-level aggregate stats.
"""

import logging
from typing import Any

from scaled.core.time import utcnow

from scaled.db.models import (
    Customer, CustomerSegment, HealthStatus,
    get_session,
)
from scaled.modules.token_health.analyzer import analyze_customer_health

logger = logging.getLogger(__name__)


def _aggregate_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Summarise a list of per-customer analysis results."""
    status_counts = {s.value: 0 for s in HealthStatus}
    errors: list[dict[str, Any]] = []
    top_at_risk: list[dict[str, Any]] = []

    for r in results:
        if "error" in r:
            errors.append(r)
            continue
        status = r.get("health_status", "healthy")
        if status in status_counts:
            status_counts[status] += 1
        if status in ("at_risk", "critical"):
            top_at_risk.append({
                "customer_id": r["customer_id"],
                "customer_name": r["customer_name"],
                "company": r["company"],
                "health_score": r["health_score"],
                "health_status": r["health_status"],
            })

    # Sort worst-first
    top_at_risk.sort(key=lambda x: x["health_score"])

    total_checked = len(results) - len(errors)
    return {
        "total_customers_checked": total_checked,
        "status_counts": status_counts,
        "top_at_risk": top_at_risk[:10],
        "errors": len(errors),
        "error_details": errors[:5],
        "scanned_at": utcnow().isoformat(),
    }


def run_health_check_all() -> dict[str, Any]:
    """Run health analysis for every customer. Returns aggregate summary."""
    session = get_session()
    try:
        customer_ids = [
            cid for (cid,) in session.query(Customer.id).all()
        ]
    finally:
        session.close()

    logger.info("Starting batch health check for %d customers", len(customer_ids))
    results = []
    for cid in customer_ids:
        try:
            result = analyze_customer_health(cid)
            results.append(result)
        except Exception as exc:
            logger.error("Health check failed for customer %d: %s", cid, exc)
            results.append({"error": str(exc), "customer_id": cid})

    summary = _aggregate_results(results)
    summary["scope"] = "all"
    return summary


def run_health_check_segment(segment: str) -> dict[str, Any]:
    """Run health analysis for a specific customer segment.

    Args:
        segment: One of the CustomerSegment enum values
                 (e.g. 'digital_native_business', 'enterprise', etc.)
    """
    # Validate segment
    try:
        seg_enum = CustomerSegment(segment)
    except ValueError:
        valid = [s.value for s in CustomerSegment]
        return {"error": f"Invalid segment '{segment}'. Valid: {valid}"}

    session = get_session()
    try:
        customer_ids = [
            cid for (cid,) in session.query(Customer.id)
            .filter(Customer.segment == seg_enum)
            .all()
        ]
    finally:
        session.close()

    logger.info(
        "Starting batch health check for %d customers in segment '%s'",
        len(customer_ids), segment,
    )
    results = []
    for cid in customer_ids:
        try:
            result = analyze_customer_health(cid)
            results.append(result)
        except Exception as exc:
            logger.error("Health check failed for customer %d: %s", cid, exc)
            results.append({"error": str(exc), "customer_id": cid})

    summary = _aggregate_results(results)
    summary["scope"] = segment
    return summary
