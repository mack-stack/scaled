"""Portfolio reporting — Claude-generated weekly summaries.

Pulls portfolio signals and asks Claude to synthesize a strategic
narrative for the VP of Customer Success.
"""

import json
import logging
from datetime import timedelta
from typing import Any

from scaled.core.time import utcnow

from sqlalchemy import func

from scaled.core.config import get_settings
from scaled.modules.telemetry.signals import compute_portfolio_signals
from scaled.db.models import (
    Customer, Play, PlayStatus, PlayType, HealthStatus,
    Communication, get_session,
)

logger = logging.getLogger(__name__)

_PORTFOLIO_REPORT_PROMPT = """\
You are a strategic Customer Success analyst writing a weekly portfolio \
report for the VP of Customer Success at Anthropic.

Context:
- Anthropic shifted from bundled seat-based pricing to usage-based \
(per-token) billing in April 2026.  Many customers are adjusting.
- Token pricing (per 1M tokens): Opus $5 input / $25 output, \
Sonnet $3/$15, Haiku $1/$5.
- The CS team manages a scaled portfolio using automated plays \
(signal-driven actions).

Your report should be:
1. **Data-driven** — cite specific numbers from the signals provided
2. **Action-oriented** — every section ends with a clear recommendation
3. **Prioritized** — lead with what matters most this week
4. Reference the pricing shift impact, onboarding pipeline health, \
and any active incidents

Return ONLY valid JSON (no markdown fences) with exactly these keys:
{
  "report_title": "<string>",
  "generated_at": "<ISO timestamp>",
  "executive_summary": "<2-3 sentence overview>",
  "portfolio_health": {
    "narrative": "<paragraph about health trends>",
    "recommendation": "<specific action>"
  },
  "key_wins": [
    {"description": "<string>", "impact": "<string>"}
  ],
  "key_risks": [
    {"description": "<string>", "urgency": "<low|medium|high|critical>", "recommendation": "<string>"}
  ],
  "focus_areas": [
    {"area": "<string>", "why": "<string>", "action": "<string>"}
  ],
  "metrics_snapshot": {
    "total_arr": "<formatted string>",
    "revenue_at_risk": "<formatted string>",
    "health_breakdown": "<summary string>",
    "onboarding_pipeline": "<summary string>"
  }
}
"""


def generate_portfolio_report() -> dict[str, Any]:
    """Generate a weekly portfolio report with Claude narrative.

    Returns the full portfolio signals plus a Claude-generated narrative.
    Falls back to signals-only if Claude is unavailable.
    """
    signals = compute_portfolio_signals()

    # Gather play execution stats for the report context
    session = get_session()
    try:
        now = utcnow()

        # Plays executed this week
        seven_days_ago = now - timedelta(days=7)

        plays_completed = session.query(Play).filter(
            Play.status == PlayStatus.COMPLETED,
            Play.executed_at >= seven_days_ago,
        ).count()

        plays_pending = session.query(Play).filter(
            Play.status == PlayStatus.PENDING,
        ).count()

        plays_skipped = session.query(Play).filter(
            Play.status == PlayStatus.SKIPPED,
            Play.executed_at >= seven_days_ago,
        ).count()

        # Play type breakdown for completed
        play_type_counts = (
            session.query(Play.play_type, func.count(Play.id))
            .filter(
                Play.status == PlayStatus.COMPLETED,
                Play.executed_at >= seven_days_ago,
            )
            .group_by(Play.play_type)
            .all()
        )
        play_type_summary = {
            pt.value if pt else "unknown": count
            for pt, count in play_type_counts
        }

        # Communication engagement this week
        comms_sent = session.query(Communication).filter(
            Communication.sent_at >= seven_days_ago,
        ).count()

        comms_opened = session.query(Communication).filter(
            Communication.sent_at >= seven_days_ago,
            Communication.opened_at.isnot(None),
        ).count()

        play_stats = {
            "plays_completed_7d": plays_completed,
            "plays_pending": plays_pending,
            "plays_skipped_7d": plays_skipped,
            "play_type_breakdown": play_type_summary,
            "comms_sent_7d": comms_sent,
            "comms_opened_7d": comms_opened,
            "open_rate_7d": (
                round((comms_opened / comms_sent) * 100, 1)
                if comms_sent > 0 else 0.0
            ),
        }

    finally:
        session.close()

    # Try Claude narrative
    settings = get_settings()
    narrative = None
    analysis_source = "signals_only"

    if settings.anthropic_api_key:
        try:
            from scaled.core.claude import ask_claude

            user_prompt = (
                "Generate the weekly portfolio report based on these signals:\n\n"
                f"Portfolio signals:\n{json.dumps(signals, indent=2, default=str)}\n\n"
                f"Play execution stats (last 7 days):\n{json.dumps(play_stats, indent=2, default=str)}"
            )
            raw = ask_claude(_PORTFOLIO_REPORT_PROMPT, user_prompt)
            narrative = json.loads(raw)
            analysis_source = "claude"
        except Exception as exc:
            logger.warning("Claude report generation failed: %s", exc)
            narrative = _fallback_narrative(signals, play_stats)
            analysis_source = "fallback"
    else:
        narrative = _fallback_narrative(signals, play_stats)
        analysis_source = "fallback"

    return {
        "signals": signals,
        "play_stats": play_stats,
        "narrative": narrative,
        "analysis_source": analysis_source,
        "generated_at": utcnow().isoformat(),
    }


def _fallback_narrative(
    signals: dict[str, Any],
    play_stats: dict[str, Any],
) -> dict[str, Any]:
    """Build a basic structured narrative without Claude."""
    hb = signals.get("health_breakdown", {})
    total = signals.get("total_customers", 0)
    critical = hb.get("critical", 0)
    at_risk = hb.get("at_risk", 0)
    healthy = hb.get("healthy", 0)
    monitor = hb.get("monitor", 0)

    top_accounts = signals.get("top_accounts_needing_attention", [])
    risk_items = []
    for acct in top_accounts:
        if acct.get("health_status") in ("critical", "at_risk"):
            risk_items.append({
                "description": f"{acct['company']} ({acct['name']}) — health score {acct['health_score']}, ARR ${acct['arr']:,.2f}",
                "urgency": "critical" if acct["health_status"] == "critical" else "high",
                "recommendation": "Review account signals and execute pending plays",
            })

    return {
        "report_title": "Weekly Portfolio Health Report",
        "generated_at": utcnow().isoformat(),
        "executive_summary": (
            f"Portfolio of {total} customers: {healthy} healthy, {monitor} monitor, "
            f"{at_risk} at-risk, {critical} critical. "
            f"Revenue at risk: ${signals.get('revenue_at_risk', 0):,.2f} of "
            f"${signals.get('total_arr', 0):,.2f} total ARR."
        ),
        "portfolio_health": {
            "narrative": (
                f"{healthy + monitor} of {total} customers are in good standing. "
                f"{at_risk + critical} require attention. "
                f"{play_stats.get('plays_pending', 0)} plays are queued for execution."
            ),
            "recommendation": (
                "Prioritize executing pending plays for critical and at-risk accounts."
                if critical + at_risk > 0
                else "Portfolio is in good health. Focus on expansion signals."
            ),
        },
        "key_wins": [],
        "key_risks": risk_items[:5],
        "focus_areas": [
            {
                "area": "Play execution",
                "why": f"{play_stats.get('plays_pending', 0)} plays pending",
                "action": "Review and execute the play queue",
            },
        ],
        "metrics_snapshot": {
            "total_arr": f"${signals.get('total_arr', 0):,.2f}",
            "revenue_at_risk": f"${signals.get('revenue_at_risk', 0):,.2f}",
            "health_breakdown": f"{healthy} healthy / {monitor} monitor / {at_risk} at-risk / {critical} critical",
            "onboarding_pipeline": f"{signals.get('onboarding_stall_count', 0)} stalled",
        },
    }
