"""
Onboarding Autopilot — Batch Operations

Scan all customers, detect stalls, compute funnel metrics.
"""

import logging
from datetime import timedelta
from collections import defaultdict

from sqlalchemy import func

from scaled.core.time import utcnow

from scaled.db.models import (
    Customer,
    OnboardingStage,
    Play,
    PlayType,
    UsageEvent,
    get_session,
)
from scaled.modules.onboarding.lifecycle import (
    STAGE_ORDER,
    evaluate_customer_stage,
    check_for_stalls,
    celebrate_milestone,
)

logger = logging.getLogger(__name__)


def run_onboarding_scan() -> dict:
    """
    Evaluate all customers: detect stage changes, stalls, and generate plays.
    Returns a summary of everything that happened.
    """
    session = get_session()
    try:
        customers = session.query(Customer).all()
        customer_ids = [c.id for c in customers]
    finally:
        session.close()

    results = {
        "scanned": 0,
        "stage_changes": [],
        "stalls_detected": [],
        "milestones_celebrated": [],
        "errors": [],
        "customers_per_stage": defaultdict(int),
    }

    for cid in customer_ids:
        results["scanned"] += 1

        # 1. Evaluate stage
        try:
            eval_result = evaluate_customer_stage(cid)
            if eval_result.get("error"):
                results["errors"].append({"customer_id": cid, "step": "evaluate", "error": eval_result["error"]})
                continue

            stage = eval_result["computed_stage"]
            results["customers_per_stage"][stage] += 1

            # 2. If stage changed, celebrate
            if eval_result.get("changed"):
                results["stage_changes"].append({
                    "customer_id": cid,
                    "company": eval_result.get("company"),
                    "from": eval_result["transition"]["from"],
                    "to": eval_result["transition"]["to"],
                })
                try:
                    celeb = celebrate_milestone(cid)
                    if celeb.get("celebrated"):
                        results["milestones_celebrated"].append({
                            "customer_id": cid,
                            "company": celeb.get("company"),
                            "stage": celeb.get("stage"),
                            "play_id": celeb.get("play_id"),
                        })
                except Exception as e:
                    results["errors"].append({"customer_id": cid, "step": "celebrate", "error": str(e)})

            # 3. Check for stalls (only if stage didn't just change)
            if not eval_result.get("changed"):
                try:
                    stall = check_for_stalls(cid)
                    if stall.get("stalled"):
                        results["stalls_detected"].append({
                            "customer_id": cid,
                            "company": stall.get("company"),
                            "stage": stall.get("stage"),
                            "days_at_stage": stall.get("days_at_stage"),
                            "play_id": stall.get("play_id"),
                        })
                except Exception as e:
                    results["errors"].append({"customer_id": cid, "step": "stall_check", "error": str(e)})

        except Exception as e:
            results["errors"].append({"customer_id": cid, "step": "evaluate", "error": str(e)})

    # Convert defaultdict to regular dict for JSON serialization
    results["customers_per_stage"] = dict(results["customers_per_stage"])

    results["summary"] = {
        "total_scanned": results["scanned"],
        "stage_changes": len(results["stage_changes"]),
        "stalls_detected": len(results["stalls_detected"]),
        "milestones_celebrated": len(results["milestones_celebrated"]),
        "errors": len(results["errors"]),
    }

    logger.info(
        f"Onboarding scan complete: {results['scanned']} customers, "
        f"{len(results['stage_changes'])} stage changes, "
        f"{len(results['stalls_detected'])} stalls"
    )

    return results


def get_onboarding_funnel() -> dict:
    """
    Compute onboarding funnel metrics:
    - Customer count per stage
    - Conversion rates between stages
    - Average time at each stage
    """
    session = get_session()
    try:
        # Count per stage
        stage_counts_raw = session.query(
            Customer.onboarding_stage,
            func.count(Customer.id),
        ).group_by(Customer.onboarding_stage).all()

        stage_counts = {}
        for stage, count in stage_counts_raw:
            key = stage.value if stage else OnboardingStage.SIGNED_UP.value
            stage_counts[key] = count

        total_customers = sum(stage_counts.values())

        # Build ordered funnel with conversion rates
        funnel_stages = []
        for i, stage in enumerate(STAGE_ORDER):
            count = stage_counts.get(stage.value, 0)
            # Cumulative: customers AT or PAST this stage
            cumulative = sum(
                stage_counts.get(s.value, 0)
                for s in STAGE_ORDER[i:]
            )

            prev_cumulative = total_customers if i == 0 else sum(
                stage_counts.get(s.value, 0)
                for s in STAGE_ORDER[i - 1:]
            )

            conversion_rate = (cumulative / prev_cumulative * 100) if prev_cumulative > 0 else 0.0

            funnel_stages.append({
                "stage": stage.value,
                "count": count,
                "cumulative_at_or_past": cumulative,
                "conversion_from_previous": round(conversion_rate, 1),
            })

        # Average time at each stage (approximation: days since last_active for those at that stage)
        avg_time_at_stage = {}
        now = utcnow()
        for stage in STAGE_ORDER:
            customers_at_stage = session.query(Customer).filter(
                Customer.onboarding_stage == stage,
            ).all()

            if customers_at_stage:
                days_list = [
                    (now - c.last_active).days if c.last_active else 0
                    for c in customers_at_stage
                ]
                avg_time_at_stage[stage.value] = round(sum(days_list) / len(days_list), 1)
            else:
                avg_time_at_stage[stage.value] = 0

        # Recent plays created (last 7 days)
        week_ago = now - timedelta(days=7)
        recent_plays = session.query(
            Play.play_type,
            func.count(Play.id),
        ).filter(
            Play.play_type.in_([
                PlayType.ONBOARDING_NUDGE,
                PlayType.REACTIVATION,
                PlayType.MILESTONE_CELEBRATION,
            ]),
            Play.created_at >= week_ago,
        ).group_by(Play.play_type).all()

        plays_summary = {p.value: count for p, count in recent_plays}

        return {
            "total_customers": total_customers,
            "funnel": funnel_stages,
            "avg_days_at_stage": avg_time_at_stage,
            "plays_last_7_days": plays_summary,
            "overall_activation_rate": round(
                funnel_stages[2]["cumulative_at_or_past"] / total_customers * 100, 1
            ) if total_customers > 0 and len(funnel_stages) > 2 else 0,
        }
    finally:
        session.close()
