"""Token Health Monitor — core analysis engine.

Computes usage signals from 30-day data, optionally enriches with Claude
analysis, and persists results as HealthCheck records.
"""

import json
import logging
from datetime import timedelta
from typing import Any

from sqlalchemy import func

from scaled.core.config import get_settings
from scaled.core.time import utcnow
from scaled.db.models import (
    Customer, UsageEvent, HealthCheck, HealthStatus,
    get_session,
)

logger = logging.getLogger(__name__)

# ── Anthropic pricing (per 1M tokens) ─────────────────────────────────────
MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-6":   {"input": 5.00,  "output": 25.00},
    "claude-sonnet-4-6": {"input": 3.00,  "output": 15.00},
    "claude-haiku-3-5":  {"input": 1.00,  "output": 5.00},
    # Aliases / shorthand callers might use
    "opus":   {"input": 5.00,  "output": 25.00},
    "sonnet": {"input": 3.00,  "output": 15.00},
    "haiku":  {"input": 1.00,  "output": 5.00},
}

CS_ANALYST_SYSTEM_PROMPT = """\
You are a senior Customer Success analyst at Anthropic, specializing in \
token-economics advisory for enterprise customers.

Context:
- Anthropic shifted from bundled seat-based pricing to usage-based (per-token) \
billing in April 2026.  Many customers are seeing 2-3x cost increases.
- Token pricing (per 1M tokens): Opus $5 input / $25 output, Sonnet $3/$15, \
Haiku $1/$5.
- Batch API is 50% off standard pricing.
- Prompt caching can save up to 90% on input tokens.
- Claude Code users tend to burn tokens fastest ($500-$2K/engineer/month at \
enterprises).

Given the usage signals below, return ONLY valid JSON (no markdown fences) \
with exactly these keys:
{
  "health_score": <int 0-100>,
  "health_status": "<healthy|monitor|at_risk|critical>",
  "recommendations": ["<string>", ...],
  "draft_email": "<string or null>"
}

Rules:
- health_score 80-100 = healthy, 60-79 = monitor, 30-59 = at_risk, 0-29 = critical
- Provide 2-3 specific, actionable recommendations in plain English.
- Include a draft_email ONLY when status is at_risk or critical.  The email \
should be empathetic, reference their specific numbers, and offer a call.
- All dollar amounts rounded to 2 decimal places.
"""


# ── Signal computation ────────────────────────────────────────────────────

def _compute_signals(customer: Customer, session) -> dict[str, Any]:
    """Pull 30-day usage and compute health signals."""
    now = utcnow()
    thirty_days_ago = now - timedelta(days=30)

    events: list[UsageEvent] = (
        session.query(UsageEvent)
        .filter(
            UsageEvent.customer_id == customer.id,
            UsageEvent.timestamp >= thirty_days_ago,
        )
        .order_by(UsageEvent.timestamp)
        .all()
    )

    if not events:
        return {
            "has_data": False,
            "total_spend": 0.0,
            "days_of_data": 0,
        }

    # ── Basic aggregates ──────────────────────────────────────────────
    total_spend = round(sum(e.cost for e in events), 2)
    total_input = sum(e.input_tokens for e in events)
    total_output = sum(e.output_tokens for e in events)
    total_cache_hits = sum(e.cache_hits for e in events)
    total_cache_misses = sum(e.cache_misses for e in events)

    first_ts = events[0].timestamp
    last_ts = events[-1].timestamp
    days_of_data = max((last_ts - first_ts).days, 1)

    daily_spend = round(total_spend / days_of_data, 2)
    monthly_commitment = customer.monthly_commitment or 0.0

    # ── Burn rate ─────────────────────────────────────────────────────
    projected_monthly = round(daily_spend * 30, 2)
    burn_rate_pct = (
        round((projected_monthly / monthly_commitment) * 100, 2)
        if monthly_commitment > 0 else None
    )

    # ── Burn acceleration (WoW) ───────────────────────────────────────
    week_buckets: dict[int, float] = {}
    for e in events:
        week_num = (e.timestamp - thirty_days_ago).days // 7
        week_buckets.setdefault(week_num, 0.0)
        week_buckets[week_num] += e.cost

    sorted_weeks = sorted(week_buckets.items())
    if len(sorted_weeks) >= 2:
        prev_week_spend = sorted_weeks[-2][1]
        curr_week_spend = sorted_weeks[-1][1]
        burn_acceleration_pct = (
            round(((curr_week_spend - prev_week_spend) / prev_week_spend) * 100, 2)
            if prev_week_spend > 0 else None
        )
    else:
        burn_acceleration_pct = None

    # ── Model mix efficiency ──────────────────────────────────────────
    model_spend: dict[str, float] = {}
    for e in events:
        model_spend.setdefault(e.model, 0.0)
        model_spend[e.model] += e.cost

    most_expensive_model = max(model_spend, key=model_spend.get) if model_spend else None
    most_expensive_pct = (
        round((model_spend[most_expensive_model] / total_spend) * 100, 2)
        if most_expensive_model and total_spend > 0 else 0.0
    )
    model_mix = {
        m: {"spend": round(s, 2), "pct": round((s / total_spend) * 100, 2) if total_spend > 0 else 0.0}
        for m, s in model_spend.items()
    }

    # ── Cache utilization ─────────────────────────────────────────────
    total_cache_events = total_cache_hits + total_cache_misses
    cache_hit_rate = (
        round((total_cache_hits / total_cache_events) * 100, 2)
        if total_cache_events > 0 else None
    )

    # ── Endpoint distribution ─────────────────────────────────────────
    endpoint_spend: dict[str, float] = {}
    endpoint_count: dict[str, int] = {}
    for e in events:
        ep = e.endpoint or "messages"
        endpoint_spend.setdefault(ep, 0.0)
        endpoint_count.setdefault(ep, 0)
        endpoint_spend[ep] += e.cost
        endpoint_count[ep] += 1

    endpoint_distribution = {
        ep: {
            "spend": round(s, 2),
            "pct": round((s / total_spend) * 100, 2) if total_spend > 0 else 0.0,
            "requests": endpoint_count.get(ep, 0),
        }
        for ep, s in endpoint_spend.items()
    }
    batch_pct = endpoint_distribution.get("batch", {}).get("pct", 0.0)

    # ── Commitment utilization ────────────────────────────────────────
    commitment_utilization_pct = (
        round((total_spend / monthly_commitment) * 100, 2)
        if monthly_commitment > 0 else None
    )

    return {
        "has_data": True,
        "days_of_data": days_of_data,
        "total_spend": total_spend,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "daily_spend": daily_spend,
        "projected_monthly_spend": projected_monthly,
        "monthly_commitment": monthly_commitment,
        "burn_rate_pct": burn_rate_pct,
        "burn_acceleration_pct": burn_acceleration_pct,
        "model_mix": model_mix,
        "most_expensive_model": most_expensive_model,
        "most_expensive_model_pct": most_expensive_pct,
        "cache_hit_rate": cache_hit_rate,
        "total_cache_hits": total_cache_hits,
        "total_cache_misses": total_cache_misses,
        "endpoint_distribution": endpoint_distribution,
        "batch_pct": batch_pct,
        "commitment_utilization_pct": commitment_utilization_pct,
    }


# ── Heuristic fallback (no Claude API key) ────────────────────────────────

def _heuristic_analysis(signals: dict[str, Any]) -> dict[str, Any]:
    """Derive health score from signals without calling Claude.

    Philosophy: every rate-limit event = an unproductive customer = a sad customer.
    Rate limiting is the PRIMARY health signal, not a secondary metric.
    A customer hitting caps frequently is at risk regardless of spend efficiency.
    """
    score = 100

    # ── Rate limiting (PRIMARY signal — highest weight) ──────────────
    # Every rate limit = lost productivity = churn risk
    rate_limit_pct = signals.get("rate_limit_hit_pct", 0)  # % of sessions hitting limit
    if rate_limit_pct > 50:
        score -= 40  # More than half their sessions are capped — critical
    elif rate_limit_pct > 25:
        score -= 25  # Frequent caps — at risk
    elif rate_limit_pct > 10:
        score -= 15  # Occasional caps — monitor
    elif rate_limit_pct > 0:
        score -= 5   # Rare caps — note it

    # ── Burn rate (commitment overage risk) ──────────────────────────
    burn = signals.get("burn_rate_pct")
    if burn is not None:
        if burn > 150:
            score -= 30
        elif burn > 120:
            score -= 15
        elif burn > 100:
            score -= 8

    # ── Burn acceleration (trajectory) ───────────────────────────────
    accel = signals.get("burn_acceleration_pct")
    if accel is not None and accel > 25:
        score -= 12

    # ── Model mix efficiency ─────────────────────────────────────────
    expensive_pct = signals.get("most_expensive_model_pct", 0)
    if expensive_pct > 80:
        score -= 12
    elif expensive_pct > 60:
        score -= 6

    # ── Cache utilization (low cache = wasted money + faster cap hits) ──
    cache = signals.get("cache_hit_rate")
    if cache is not None and cache < 20:
        score -= 10

    # ── Batch usage (lack of batch = missing easy savings) ───────────
    batch = signals.get("batch_pct", 0)
    if batch < 5:
        score -= 5

    score = max(0, min(100, score))

    if score >= 80:
        status = HealthStatus.HEALTHY
    elif score >= 60:
        status = HealthStatus.MONITOR
    elif score >= 30:
        status = HealthStatus.AT_RISK
    else:
        status = HealthStatus.CRITICAL

    recommendations = []
    # Rate limiting recommendations come FIRST — it's the loudest signal
    if rate_limit_pct > 10:
        recommendations.append(
            f"Rate limiting detected on {rate_limit_pct}% of sessions. "
            "Every cap hit = lost productivity. Consider upgrading plan tier, "
            "optimizing token usage with caching/batching, or switching to "
            "lighter models for non-critical tasks to stay under limits."
        )
    if burn is not None and burn > 100:
        recommendations.append(
            f"Burn rate is at {burn}% of monthly commitment. "
            "Review usage patterns to avoid overage charges."
        )
    if expensive_pct > 60:
        recommendations.append(
            f"{expensive_pct}% of spend is on the most expensive model. "
            "Evaluate if Haiku or Sonnet could handle some of those workloads."
        )
    if cache is not None and cache < 30:
        recommendations.append(
            f"Cache hit rate is only {cache}%. Implementing prompt caching "
            "could save up to 90% on input token costs."
        )
    if batch < 10:
        recommendations.append(
            "Very little Batch API usage detected. Batch requests are 50% "
            "cheaper — shift non-latency-sensitive workloads to batch."
        )

    # Trim to 3 max
    recommendations = recommendations[:3]

    return {
        "health_score": score,
        "health_status": status.value,
        "recommendations": recommendations,
        "draft_email": None,
    }


# ── Main analyzer ─────────────────────────────────────────────────────────

def analyze_customer_health(customer_id: int) -> dict[str, Any]:
    """Run full token-health analysis for a single customer.

    Returns a dict with: customer_id, customer_name, company, signals,
    health_score, health_status, recommendations, draft_email, analysis_source.
    """
    session = get_session()
    try:
        customer = session.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer {customer_id} not found"}

        signals = _compute_signals(customer, session)

        if not signals["has_data"]:
            # No usage data — mark healthy by default, nothing to alert on
            result = {
                "health_score": 100,
                "health_status": HealthStatus.HEALTHY.value,
                "recommendations": ["No usage data in the last 30 days."],
                "draft_email": None,
            }
            analysis_source = "no_data"
        else:
            settings = get_settings()
            if settings.anthropic_api_key:
                try:
                    from scaled.core.claude import ask_claude
                    user_prompt = (
                        f"Customer: {customer.name} ({customer.company})\n"
                        f"Segment: {customer.segment.value if customer.segment else 'unknown'}\n"
                        f"Plan: {customer.plan_tier.value if customer.plan_tier else 'unknown'}\n"
                        f"Monthly commitment: ${signals['monthly_commitment']:.2f}\n\n"
                        f"Usage signals (last {signals['days_of_data']} days):\n"
                        f"{json.dumps(signals, indent=2, default=str)}"
                    )
                    raw = ask_claude(CS_ANALYST_SYSTEM_PROMPT, user_prompt)
                    result = json.loads(raw)
                    analysis_source = "claude"
                except Exception as exc:
                    logger.warning("Claude analysis failed, falling back to heuristic: %s", exc)
                    result = _heuristic_analysis(signals)
                    analysis_source = "heuristic_fallback"
            else:
                result = _heuristic_analysis(signals)
                analysis_source = "heuristic"

        # Normalise status string → enum
        status_str = result.get("health_status", "healthy")
        try:
            health_status = HealthStatus(status_str)
        except ValueError:
            health_status = HealthStatus.HEALTHY

        health_score = max(0, min(100, int(result.get("health_score", 100))))

        # Persist HealthCheck
        hc = HealthCheck(
            customer_id=customer.id,
            score=health_score,
            status=health_status,
            signals=signals,
            analysis=json.dumps(result),
            recommendations=result.get("recommendations", []),
        )
        session.add(hc)

        # Update customer record
        customer.health_score = health_score
        customer.health_status = health_status
        session.commit()

        return {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "company": customer.company,
            "segment": customer.segment.value if customer.segment else None,
            "plan_tier": customer.plan_tier.value if customer.plan_tier else None,
            "signals": signals,
            "health_score": health_score,
            "health_status": health_status.value,
            "recommendations": result.get("recommendations", []),
            "draft_email": result.get("draft_email"),
            "analysis_source": analysis_source,
            "checked_at": utcnow().isoformat(),
        }

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
