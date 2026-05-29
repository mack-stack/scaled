"""Telemetry signal detection engine.

Computes portfolio-level and customer-level signals, then maps signals
to recommended plays (actions).  Signal computation is deterministic —
no Claude calls here.
"""

import logging
from datetime import timedelta
from typing import Any

from sqlalchemy import func, and_, or_

from scaled.core.time import utcnow

from scaled.db.models import (
    Customer, UsageEvent, HealthCheck, HealthStatus, Incident,
    Play, PlayType, PlayStatus, Communication,
    OnboardingStage, CustomerSegment,
    get_session,
)

logger = logging.getLogger(__name__)

# Onboarding stage ordering (for stall detection)
_ONBOARDING_ORDER = [s.value for s in OnboardingStage]

# Days-at-stage thresholds before a nudge is warranted
_STALL_THRESHOLDS: dict[str, int] = {
    OnboardingStage.SIGNED_UP.value: 3,
    OnboardingStage.API_KEY_CREATED.value: 5,
    OnboardingStage.FIRST_API_CALL.value: 7,
    OnboardingStage.FIRST_WORKFLOW.value: 10,
    OnboardingStage.INTEGRATED.value: 14,
    OnboardingStage.SCALING.value: 21,
    OnboardingStage.CHAMPION.value: 999,  # never stalls
}

# Health status priority for sorting (lower = more urgent)
_HEALTH_PRIORITY = {
    HealthStatus.CRITICAL: 0,
    HealthStatus.AT_RISK: 1,
    HealthStatus.MONITOR: 2,
    HealthStatus.HEALTHY: 3,
}


# ── Portfolio-level signals ──────────────────────────────────────────────


def compute_portfolio_signals() -> dict[str, Any]:
    """Scan all customers and compute aggregate portfolio signals."""
    session = get_session()
    try:
        now = utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        prior_7d_start = now - timedelta(days=14)
        prior_30d_start = now - timedelta(days=60)

        customers = session.query(Customer).all()
        total = len(customers)

        # ── Health breakdown ─────────────────────────────────────────
        health_breakdown = {s.value: 0 for s in HealthStatus}
        for c in customers:
            status = c.health_status.value if c.health_status else HealthStatus.HEALTHY.value
            health_breakdown[status] = health_breakdown.get(status, 0) + 1

        # ── Revenue at risk ──────────────────────────────────────────
        revenue_at_risk = round(sum(
            c.arr or 0.0 for c in customers
            if c.health_status in (HealthStatus.AT_RISK, HealthStatus.CRITICAL)
        ), 2)

        total_arr = round(sum(c.arr or 0.0 for c in customers), 2)

        # ── Segment health comparison ────────────────────────────────
        segment_health: dict[str, dict] = {}
        for c in customers:
            seg = c.segment.value if c.segment else "unknown"
            if seg not in segment_health:
                segment_health[seg] = {"count": 0, "total_score": 0, "arr": 0.0}
            segment_health[seg]["count"] += 1
            segment_health[seg]["total_score"] += (c.health_score or 100)
            segment_health[seg]["arr"] += (c.arr or 0.0)

        for seg in segment_health:
            cnt = segment_health[seg]["count"]
            segment_health[seg]["avg_score"] = round(
                segment_health[seg]["total_score"] / cnt, 1
            ) if cnt > 0 else 0
            segment_health[seg]["arr"] = round(segment_health[seg]["arr"], 2)
            del segment_health[seg]["total_score"]

        # ── Usage trends ─────────────────────────────────────────────
        def _usage_window(start, end):
            row = session.query(
                func.coalesce(func.sum(UsageEvent.input_tokens + UsageEvent.output_tokens), 0).label("tokens"),
                func.coalesce(func.sum(UsageEvent.cost), 0.0).label("spend"),
            ).filter(
                UsageEvent.timestamp >= start,
                UsageEvent.timestamp < end,
            ).first()
            return int(row.tokens), round(float(row.spend), 2)

        tokens_7d, spend_7d = _usage_window(seven_days_ago, now)
        tokens_30d, spend_30d = _usage_window(thirty_days_ago, now)
        tokens_prior_7d, spend_prior_7d = _usage_window(prior_7d_start, seven_days_ago)
        tokens_prior_30d, spend_prior_30d = _usage_window(prior_30d_start, thirty_days_ago)

        spend_growth_7d = (
            round(((spend_7d - spend_prior_7d) / spend_prior_7d) * 100, 2)
            if spend_prior_7d > 0 else None
        )
        spend_growth_30d = (
            round(((spend_30d - spend_prior_30d) / spend_prior_30d) * 100, 2)
            if spend_prior_30d > 0 else None
        )

        # ── Onboarding funnel ────────────────────────────────────────
        onboarding_funnel = {s.value: 0 for s in OnboardingStage}
        stall_count = 0
        for c in customers:
            stage = c.onboarding_stage.value if c.onboarding_stage else OnboardingStage.SIGNED_UP.value
            onboarding_funnel[stage] = onboarding_funnel.get(stage, 0) + 1
            # Stall detection: days since last_active vs threshold
            threshold = _STALL_THRESHOLDS.get(stage, 7)
            days_inactive = (now - c.last_active).days if c.last_active else 999
            if stage != OnboardingStage.CHAMPION.value and days_inactive > threshold:
                stall_count += 1

        # ── Active incidents ─────────────────────────────────────────
        active_incidents = session.query(Incident).filter(
            Incident.is_active == True  # noqa: E712
        ).all()

        incident_count = len(active_incidents)
        # Approximate impacted customers (customers with any usage in the
        # affected models/services) — simplified: count distinct customers
        # with recent usage if any incident is active
        impacted_customer_count = 0
        if active_incidents:
            affected_models = set()
            for inc in active_incidents:
                if inc.affected_models:
                    affected_models.update(inc.affected_models)
            if affected_models:
                impacted_customer_count = session.query(
                    func.count(func.distinct(UsageEvent.customer_id))
                ).filter(
                    UsageEvent.timestamp >= seven_days_ago,
                    UsageEvent.model.in_(list(affected_models)),
                ).scalar() or 0

        # ── Top 5 accounts needing attention ─────────────────────────
        attention_accounts = sorted(
            customers,
            key=lambda c: (
                _HEALTH_PRIORITY.get(c.health_status, 3),
                -(c.arr or 0.0),
            ),
        )[:5]

        top_accounts = [
            {
                "customer_id": c.id,
                "name": c.name,
                "company": c.company,
                "health_score": c.health_score,
                "health_status": c.health_status.value if c.health_status else "healthy",
                "arr": round(c.arr or 0.0, 2),
                "segment": c.segment.value if c.segment else None,
            }
            for c in attention_accounts
        ]

        return {
            "generated_at": now.isoformat(),
            "total_customers": total,
            "health_breakdown": health_breakdown,
            "total_arr": total_arr,
            "revenue_at_risk": revenue_at_risk,
            "segment_health": segment_health,
            "usage_trends": {
                "tokens_7d": tokens_7d,
                "tokens_30d": tokens_30d,
                "spend_7d": spend_7d,
                "spend_30d": spend_30d,
                "spend_growth_7d_pct": spend_growth_7d,
                "spend_growth_30d_pct": spend_growth_30d,
            },
            "onboarding_funnel": onboarding_funnel,
            "onboarding_stall_count": stall_count,
            "active_incidents": incident_count,
            "incident_impacted_customers": impacted_customer_count,
            "top_accounts_needing_attention": top_accounts,
        }

    finally:
        session.close()


# ── Customer-level signals ───────────────────────────────────────────────


def compute_customer_signals(customer_id: int) -> dict[str, Any]:
    """Roll up all signals for a single customer."""
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer {customer_id} not found"}

        now = utcnow()
        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # ── Latest health check ──────────────────────────────────────
        latest_hc = (
            session.query(HealthCheck)
            .filter(HealthCheck.customer_id == customer_id)
            .order_by(HealthCheck.timestamp.desc())
            .first()
        )

        # Health check from 7 days ago for delta
        hc_7d_ago = (
            session.query(HealthCheck)
            .filter(
                HealthCheck.customer_id == customer_id,
                HealthCheck.timestamp <= seven_days_ago,
            )
            .order_by(HealthCheck.timestamp.desc())
            .first()
        )

        health_score = customer.health_score or 100
        health_status = customer.health_status.value if customer.health_status else "healthy"
        health_score_7d_ago = hc_7d_ago.score if hc_7d_ago else None
        health_score_delta = (
            health_score - health_score_7d_ago
            if health_score_7d_ago is not None else None
        )

        # ── Spend trends ─────────────────────────────────────────────
        def _customer_spend(start, end):
            val = session.query(
                func.coalesce(func.sum(UsageEvent.cost), 0.0)
            ).filter(
                UsageEvent.customer_id == customer_id,
                UsageEvent.timestamp >= start,
                UsageEvent.timestamp < end,
            ).scalar()
            return round(float(val), 2)

        spend_7d = _customer_spend(seven_days_ago, now)
        spend_prior_7d = _customer_spend(fourteen_days_ago, seven_days_ago)
        spend_30d = _customer_spend(thirty_days_ago, now)
        spend_prior_30d = _customer_spend(sixty_days_ago, thirty_days_ago)

        spend_change_7d_pct = (
            round(((spend_7d - spend_prior_7d) / spend_prior_7d) * 100, 2)
            if spend_prior_7d > 0 else None
        )
        spend_change_30d_pct = (
            round(((spend_30d - spend_prior_30d) / spend_prior_30d) * 100, 2)
            if spend_prior_30d > 0 else None
        )

        # ── Burn rate ────────────────────────────────────────────────
        monthly_commitment = customer.monthly_commitment or 0.0
        projected_monthly = round((spend_7d / 7) * 30, 2) if spend_7d > 0 else 0.0
        burn_rate_pct = (
            round((projected_monthly / monthly_commitment) * 100, 2)
            if monthly_commitment > 0 else None
        )

        # ── Onboarding ───────────────────────────────────────────────
        onboarding_stage = (
            customer.onboarding_stage.value
            if customer.onboarding_stage else OnboardingStage.SIGNED_UP.value
        )
        days_at_stage = (now - customer.last_active).days if customer.last_active else 0
        stall_threshold = _STALL_THRESHOLDS.get(onboarding_stage, 7)
        is_stalled = (
            onboarding_stage != OnboardingStage.CHAMPION.value
            and days_at_stage > stall_threshold
        )

        # ── Active plays ─────────────────────────────────────────────
        active_plays = (
            session.query(Play)
            .filter(
                Play.customer_id == customer_id,
                Play.status.in_([PlayStatus.PENDING, PlayStatus.EXECUTING]),
            )
            .all()
        )

        plays_summary = [
            {
                "play_id": p.id,
                "play_type": p.play_type.value if p.play_type else None,
                "status": p.status.value if p.status else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in active_plays
        ]

        # ── Recent communications ────────────────────────────────────
        recent_comms = (
            session.query(Communication)
            .filter(
                Communication.customer_id == customer_id,
                Communication.sent_at >= thirty_days_ago,
            )
            .order_by(Communication.sent_at.desc())
            .limit(10)
            .all()
        )

        comms_summary = [
            {
                "id": cm.id,
                "channel": cm.channel,
                "subject": cm.subject,
                "sent_at": cm.sent_at.isoformat() if cm.sent_at else None,
                "opened": cm.opened_at is not None,
                "clicked": cm.clicked_at is not None,
            }
            for cm in recent_comms
        ]

        total_sent = len(recent_comms)
        total_opened = sum(1 for cm in recent_comms if cm.opened_at)
        total_clicked = sum(1 for cm in recent_comms if cm.clicked_at)

        # ── Days since last usage ────────────────────────────────────
        last_event = (
            session.query(UsageEvent)
            .filter(UsageEvent.customer_id == customer_id)
            .order_by(UsageEvent.timestamp.desc())
            .first()
        )
        days_since_last_usage = (
            (now - last_event.timestamp).days if last_event else None
        )

        # ── Model mix (for optimization signal) ─────────────────────
        model_spend = (
            session.query(
                UsageEvent.model,
                func.sum(UsageEvent.cost).label("cost"),
            )
            .filter(
                UsageEvent.customer_id == customer_id,
                UsageEvent.timestamp >= thirty_days_ago,
            )
            .group_by(UsageEvent.model)
            .all()
        )
        model_mix = {
            row.model: round(float(row.cost), 2) for row in model_spend
        }
        total_model_spend = sum(model_mix.values())
        expensive_model_pct = 0.0
        if total_model_spend > 0:
            opus_spend = sum(
                v for k, v in model_mix.items()
                if "opus" in k.lower()
            )
            expensive_model_pct = round((opus_spend / total_model_spend) * 100, 2)

        # ── Risk signals ─────────────────────────────────────────────
        risk_signals = []
        if spend_change_7d_pct is not None and spend_change_7d_pct < -30:
            risk_signals.append("declining_usage")
        if burn_rate_pct is not None and burn_rate_pct > 120:
            risk_signals.append("burn_rate_spike")
        if is_stalled:
            risk_signals.append("stalled_onboarding")
        if days_since_last_usage is not None and days_since_last_usage >= 14:
            risk_signals.append("inactive")
        if health_score_delta is not None and health_score_delta < -20:
            risk_signals.append("health_declining")

        return {
            "customer_id": customer.id,
            "name": customer.name,
            "company": customer.company,
            "segment": customer.segment.value if customer.segment else None,
            "plan_tier": customer.plan_tier.value if customer.plan_tier else None,
            "arr": round(customer.arr or 0.0, 2),
            "health": {
                "score": health_score,
                "status": health_status,
                "score_7d_ago": health_score_7d_ago,
                "score_delta_7d": health_score_delta,
            },
            "spend": {
                "last_7d": spend_7d,
                "prior_7d": spend_prior_7d,
                "change_7d_pct": spend_change_7d_pct,
                "last_30d": spend_30d,
                "prior_30d": spend_prior_30d,
                "change_30d_pct": spend_change_30d_pct,
                "projected_monthly": projected_monthly,
                "monthly_commitment": monthly_commitment,
                "burn_rate_pct": burn_rate_pct,
            },
            "onboarding": {
                "stage": onboarding_stage,
                "days_at_stage": days_at_stage,
                "is_stalled": is_stalled,
            },
            "active_plays": plays_summary,
            "communications": {
                "recent": comms_summary,
                "total_sent_30d": total_sent,
                "total_opened_30d": total_opened,
                "total_clicked_30d": total_clicked,
            },
            "model_mix": model_mix,
            "days_since_last_usage": days_since_last_usage,
            "risk_signals": risk_signals,
            "generated_at": now.isoformat(),
        }

    finally:
        session.close()


# ── Play detection ───────────────────────────────────────────────────────


def _has_active_play(session, customer_id: int, play_type: PlayType) -> bool:
    """Check if a PENDING or EXECUTING play of this type already exists."""
    return session.query(Play).filter(
        Play.customer_id == customer_id,
        Play.play_type == play_type,
        Play.status.in_([PlayStatus.PENDING, PlayStatus.EXECUTING]),
    ).first() is not None


def detect_plays(customer_id: int) -> list[dict[str, Any]]:
    """Analyse customer signals and create recommended plays.

    Idempotent — won't create duplicate plays for an already-active signal.
    Returns list of newly created play dicts.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return []

        now = utcnow()
        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        new_plays: list[dict[str, Any]] = []

        def _maybe_create(play_type: PlayType, trigger: dict):
            if _has_active_play(session, customer_id, play_type):
                return
            play = Play(
                customer_id=customer_id,
                play_type=play_type,
                status=PlayStatus.PENDING,
                trigger_signal=trigger,
            )
            session.add(play)
            session.flush()  # get play.id
            new_plays.append({
                "play_id": play.id,
                "customer_id": customer_id,
                "play_type": play_type.value,
                "trigger_signal": trigger,
                "status": PlayStatus.PENDING.value,
            })

        # ── Burn rate > 120% of commitment ───────────────────────────
        monthly_commitment = customer.monthly_commitment or 0.0
        if monthly_commitment > 0:
            spend_7d = float(session.query(
                func.coalesce(func.sum(UsageEvent.cost), 0.0)
            ).filter(
                UsageEvent.customer_id == customer_id,
                UsageEvent.timestamp >= seven_days_ago,
            ).scalar())
            projected = round((spend_7d / 7) * 30, 2)
            burn_pct = round((projected / monthly_commitment) * 100, 2)
            if burn_pct > 120:
                _maybe_create(PlayType.BURN_RATE_ALERT, {
                    "burn_rate_pct": burn_pct,
                    "projected_monthly": projected,
                    "monthly_commitment": monthly_commitment,
                })

        # ── Health score dropped > 20 points in 7 days ───────────────
        hc_7d_ago = (
            session.query(HealthCheck)
            .filter(
                HealthCheck.customer_id == customer_id,
                HealthCheck.timestamp <= seven_days_ago,
            )
            .order_by(HealthCheck.timestamp.desc())
            .first()
        )
        if hc_7d_ago and customer.health_score is not None:
            score_delta = customer.health_score - hc_7d_ago.score
            if score_delta < -20:
                _maybe_create(PlayType.CHURN_RISK, {
                    "current_score": customer.health_score,
                    "score_7d_ago": hc_7d_ago.score,
                    "delta": score_delta,
                })

        # ── Spend growing > 50% MoM AND healthy → expansion ─────────
        spend_30d = float(session.query(
            func.coalesce(func.sum(UsageEvent.cost), 0.0)
        ).filter(
            UsageEvent.customer_id == customer_id,
            UsageEvent.timestamp >= thirty_days_ago,
        ).scalar())
        spend_prior_30d = float(session.query(
            func.coalesce(func.sum(UsageEvent.cost), 0.0)
        ).filter(
            UsageEvent.customer_id == customer_id,
            UsageEvent.timestamp >= sixty_days_ago,
            UsageEvent.timestamp < thirty_days_ago,
        ).scalar())
        if spend_prior_30d > 0:
            mom_growth = ((spend_30d - spend_prior_30d) / spend_prior_30d) * 100
            if mom_growth > 50 and customer.health_status == HealthStatus.HEALTHY:
                _maybe_create(PlayType.EXPANSION_SIGNAL, {
                    "spend_30d": round(spend_30d, 2),
                    "spend_prior_30d": round(spend_prior_30d, 2),
                    "mom_growth_pct": round(mom_growth, 2),
                })

        # ── Stalled onboarding ───────────────────────────────────────
        stage = (
            customer.onboarding_stage.value
            if customer.onboarding_stage else OnboardingStage.SIGNED_UP.value
        )
        if stage != OnboardingStage.CHAMPION.value:
            threshold = _STALL_THRESHOLDS.get(stage, 7)
            days_inactive = (now - customer.last_active).days if customer.last_active else 999
            if days_inactive > threshold:
                _maybe_create(PlayType.ONBOARDING_NUDGE, {
                    "stage": stage,
                    "days_at_stage": days_inactive,
                    "threshold": threshold,
                })

        # ── No usage in 14+ days ─────────────────────────────────────
        last_event = (
            session.query(UsageEvent)
            .filter(UsageEvent.customer_id == customer_id)
            .order_by(UsageEvent.timestamp.desc())
            .first()
        )
        if last_event:
            days_inactive = (now - last_event.timestamp).days
            if days_inactive >= 14:
                _maybe_create(PlayType.REACTIVATION, {
                    "days_since_last_usage": days_inactive,
                    "last_usage_date": last_event.timestamp.isoformat(),
                })
        elif customer.last_active:
            days_inactive = (now - customer.last_active).days
            if days_inactive >= 14:
                _maybe_create(PlayType.REACTIVATION, {
                    "days_since_last_usage": days_inactive,
                })

        # ── Expensive models for simple tasks → optimization ─────────
        if spend_30d > 0:
            model_spend = (
                session.query(
                    UsageEvent.model,
                    func.sum(UsageEvent.cost).label("cost"),
                )
                .filter(
                    UsageEvent.customer_id == customer_id,
                    UsageEvent.timestamp >= thirty_days_ago,
                )
                .group_by(UsageEvent.model)
                .all()
            )
            opus_spend = sum(
                float(row.cost) for row in model_spend
                if "opus" in row.model.lower()
            )
            opus_pct = (opus_spend / spend_30d) * 100
            if opus_pct > 70:
                _maybe_create(PlayType.TOKEN_OPTIMIZATION, {
                    "opus_spend_pct": round(opus_pct, 2),
                    "total_spend_30d": round(spend_30d, 2),
                    "potential_savings": round(opus_spend * 0.4, 2),  # ~40% by downgrading some
                })

        session.commit()
        return new_plays

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
