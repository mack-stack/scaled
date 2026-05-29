"""Seed the database with realistic demo data simulating Anthropic's customer segments."""
import random
from datetime import datetime, timedelta, timezone
from scaled.db.models import (
    get_session, init_db, Customer, UsageEvent, Incident,
    CustomerSegment, PlanTier, OnboardingStage, HealthStatus,
    IncidentSeverity,
)

# Token pricing per model (per 1M tokens)
PRICING = {
    "claude-opus-4-6": {"input": 5.0, "output": 25.0},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0},
}

# Realistic customer profiles matching Anthropic's segments
CUSTOMERS = [
    # DNB — Digital Native Business (high-growth tech)
    {"name": "Sarah Chen", "company": "StreamScale AI", "segment": CustomerSegment.DNB,
     "plan": PlanTier.ENTERPRISE, "seats": 120, "commitment": 85000, "arr": 1020000,
     "stage": OnboardingStage.SCALING, "profile": "series_c_startup_heavy_claude_code"},
    {"name": "Marcus Rivera", "company": "DataPipe Labs", "segment": CustomerSegment.DNB,
     "plan": PlanTier.ENTERPRISE, "seats": 45, "commitment": 32000, "arr": 384000,
     "stage": OnboardingStage.INTEGRATED, "profile": "mid_stage_api_first"},
    {"name": "Priya Patel", "company": "NexaFlow", "segment": CustomerSegment.DNB,
     "plan": PlanTier.TEAM_PREMIUM, "seats": 18, "commitment": 0, "arr": 27000,
     "stage": OnboardingStage.FIRST_WORKFLOW, "profile": "early_stage_exploring"},
    {"name": "James Okonkwo", "company": "Veridia Health", "segment": CustomerSegment.DNB,
     "plan": PlanTier.ENTERPRISE, "seats": 200, "commitment": 150000, "arr": 1800000,
     "stage": OnboardingStage.CHAMPION, "profile": "scale_up_all_in"},

    # Strategics — Fortune 500 tech
    {"name": "Elena Vasquez", "company": "Fortuna Financial", "segment": CustomerSegment.STRATEGICS,
     "plan": PlanTier.ENTERPRISE, "seats": 500, "commitment": 250000, "arr": 3000000,
     "stage": OnboardingStage.SCALING, "profile": "f500_cautious_rollout"},
    {"name": "David Kim", "company": "Meridian Systems", "segment": CustomerSegment.STRATEGICS,
     "plan": PlanTier.ENTERPRISE, "seats": 1200, "commitment": 400000, "arr": 4800000,
     "stage": OnboardingStage.CHAMPION, "profile": "f500_heavy_adoption"},

    # Industries — FinServ, Manufacturing, Retail
    {"name": "Rachel Torres", "company": "Pacific Coast Manufacturing", "segment": CustomerSegment.INDUSTRIES,
     "plan": PlanTier.ENTERPRISE, "seats": 80, "commitment": 45000, "arr": 540000,
     "stage": OnboardingStage.FIRST_WORKFLOW, "profile": "manufacturing_cautious"},
    {"name": "Tom Nakamura", "company": "Redwood Retail Group", "segment": CustomerSegment.INDUSTRIES,
     "plan": PlanTier.TEAM_STANDARD, "seats": 25, "commitment": 0, "arr": 7500,
     "stage": OnboardingStage.FIRST_API_CALL, "profile": "retail_pilot"},

    # Self-Serve — landed through product, no CSM
    {"name": "Alex Novak", "company": "Indie Dev Shop", "segment": CustomerSegment.SELF_SERVE,
     "plan": PlanTier.API, "seats": 1, "commitment": 0, "arr": 2400,
     "stage": OnboardingStage.SCALING, "profile": "solo_dev_power_user"},
    {"name": "Maya Washington", "company": "ContentForge", "segment": CustomerSegment.SELF_SERVE,
     "plan": PlanTier.PRO, "seats": 1, "commitment": 0, "arr": 240,
     "stage": OnboardingStage.FIRST_API_CALL, "profile": "content_creator_stuck"},
    {"name": "Jordan Liu", "company": "QuantumLeap Analytics", "segment": CustomerSegment.SELF_SERVE,
     "plan": PlanTier.MAX_200, "seats": 1, "commitment": 0, "arr": 2400,
     "stage": OnboardingStage.INTEGRATED, "profile": "data_scientist_heavy"},
    {"name": "Casey Murphy", "company": "BuildRight Contractors", "segment": CustomerSegment.SMALL_BUSINESS,
     "plan": PlanTier.TEAM_STANDARD, "seats": 8, "commitment": 0, "arr": 2400,
     "stage": OnboardingStage.SIGNED_UP, "profile": "smb_just_signed_up"},

    # More self-serve long tail
    {"name": "Lin Zhang", "company": "ZhangML Consulting", "segment": CustomerSegment.SELF_SERVE,
     "plan": PlanTier.API, "seats": 1, "commitment": 0, "arr": 12000,
     "stage": OnboardingStage.SCALING, "profile": "api_whale_no_csm"},
    {"name": "Sofia Andersson", "company": "Nordic Code Labs", "segment": CustomerSegment.SELF_SERVE,
     "plan": PlanTier.TEAM_PREMIUM, "seats": 5, "commitment": 0, "arr": 7500,
     "stage": OnboardingStage.INTEGRATED, "profile": "small_team_growing"},
    {"name": "Raj Mehta", "company": "FinBot Solutions", "segment": CustomerSegment.DNB,
     "plan": PlanTier.ENTERPRISE, "seats": 60, "commitment": 55000, "arr": 660000,
     "stage": OnboardingStage.INTEGRATED, "profile": "fintech_compliance_heavy"},
    {"name": "Amy Brennan", "company": "LegalEdge AI", "segment": CustomerSegment.INDUSTRIES,
     "plan": PlanTier.ENTERPRISE, "seats": 35, "commitment": 28000, "arr": 336000,
     "stage": OnboardingStage.FIRST_WORKFLOW, "profile": "legal_slow_rollout"},
]


# Usage pattern generators per profile
def generate_usage(customer_data: dict, customer_id: int, days: int = 90) -> list[dict]:
    """Generate realistic usage events based on customer profile."""
    events = []
    profile = customer_data["profile"]
    now = datetime.now(timezone.utc)

    for day_offset in range(days, 0, -1):
        day = now - timedelta(days=day_offset)

        if profile == "series_c_startup_heavy_claude_code":
            # Heavy Claude Code users — burn rate spiking post pricing change
            daily_calls = random.randint(800, 2000) if day_offset < 30 else random.randint(400, 800)
            models = [("claude-sonnet-4-6", 0.6), ("claude-opus-4-6", 0.3), ("claude-haiku-4-5", 0.1)]
            endpoints = [("claude_code", 0.7), ("messages", 0.2), ("batch", 0.1)]

        elif profile == "f500_cautious_rollout":
            # Slow ramp, but steady
            base = min(50 + (90 - day_offset) * 3, 300)
            daily_calls = random.randint(max(10, base - 50), base + 50)
            models = [("claude-sonnet-4-6", 0.8), ("claude-haiku-4-5", 0.2)]
            endpoints = [("messages", 0.6), ("batch", 0.4)]

        elif profile == "f500_heavy_adoption":
            # Massive scale, mostly batch + API
            daily_calls = random.randint(3000, 8000)
            models = [("claude-sonnet-4-6", 0.5), ("claude-haiku-4-5", 0.35), ("claude-opus-4-6", 0.15)]
            endpoints = [("batch", 0.5), ("messages", 0.3), ("claude_code", 0.2)]

        elif profile == "api_whale_no_csm":
            # Solo dev spending $1K+/mo on API, no relationship
            daily_calls = random.randint(200, 600)
            models = [("claude-sonnet-4-6", 0.7), ("claude-opus-4-6", 0.3)]
            endpoints = [("messages", 0.9), ("batch", 0.1)]

        elif profile in ("content_creator_stuck", "smb_just_signed_up"):
            # Low/no usage — at risk of churning
            daily_calls = random.randint(0, 5) if day_offset > 7 else random.randint(0, 2)
            models = [("claude-sonnet-4-6", 1.0)]
            endpoints = [("messages", 1.0)]

        elif profile == "manufacturing_cautious":
            # Weekdays only, controlled pilot
            if day.weekday() >= 5:
                continue
            daily_calls = random.randint(20, 80)
            models = [("claude-sonnet-4-6", 0.9), ("claude-haiku-4-5", 0.1)]
            endpoints = [("messages", 0.7), ("batch", 0.3)]

        elif profile == "fintech_compliance_heavy":
            # Steady but with compliance review pauses
            daily_calls = random.randint(100, 400) if day_offset % 30 > 5 else random.randint(5, 20)
            models = [("claude-sonnet-4-6", 0.6), ("claude-opus-4-6", 0.4)]
            endpoints = [("messages", 0.5), ("batch", 0.5)]

        else:
            # Default moderate usage
            daily_calls = random.randint(30, 200)
            models = [("claude-sonnet-4-6", 0.7), ("claude-haiku-4-5", 0.2), ("claude-opus-4-6", 0.1)]
            endpoints = [("messages", 0.6), ("claude_code", 0.3), ("batch", 0.1)]

        # Generate aggregated daily events (not per-call — keeps DB reasonable)
        for _ in range(min(daily_calls // 50 + 1, 10)):
            model = random.choices([m[0] for m in models], [m[1] for m in models])[0]
            endpoint = random.choices([e[0] for e in endpoints], [e[1] for e in endpoints])[0]
            chunk_size = daily_calls // (min(daily_calls // 50 + 1, 10))

            input_tokens = chunk_size * random.randint(500, 4000)
            output_tokens = chunk_size * random.randint(200, 2000)

            pricing = PRICING[model]
            cost = (input_tokens / 1_000_000 * pricing["input"] +
                    output_tokens / 1_000_000 * pricing["output"])

            cache_rate = 0.6 if endpoint == "claude_code" else 0.3
            cache_hits = int(input_tokens * cache_rate * random.uniform(0.5, 1.0))

            events.append({
                "customer_id": customer_id,
                "timestamp": day + timedelta(hours=random.randint(8, 20), minutes=random.randint(0, 59)),
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": round(cost, 4),
                "endpoint": endpoint,
                "cache_hits": cache_hits,
                "cache_misses": input_tokens - cache_hits,
            })

    return events


# Historical incidents matching real Anthropic events
INCIDENTS = [
    {
        "title": "Claude Code reasoning effort degradation",
        "description": "Default reasoning effort switched from high to medium, causing reduced code quality and increased error rates for Claude Code users.",
        "severity": IncidentSeverity.HIGH,
        "started_at": datetime(2026, 3, 4, tzinfo=timezone.utc),
        "resolved_at": datetime(2026, 3, 18, tzinfo=timezone.utc),
        "affected_services": ["claude_code"],
        "affected_models": ["claude-sonnet-4-6"],
        "is_active": False,
    },
    {
        "title": "Context caching bug — thinking sections cleared",
        "description": "Optimization cleared thinking/reasoning sections on every conversation turn instead of once, leaving Claude without prior context in long sessions.",
        "severity": IncidentSeverity.CRITICAL,
        "started_at": datetime(2026, 3, 26, tzinfo=timezone.utc),
        "resolved_at": datetime(2026, 4, 10, tzinfo=timezone.utc),
        "affected_services": ["api", "claude_code"],
        "affected_models": ["claude-sonnet-4-6", "claude-opus-4-6"],
        "is_active": False,
    },
    {
        "title": "Peak-hour capacity throttling",
        "description": "Intentional capacity reduction during high-demand periods causing increased latency and quota exhaustion. Users reported 19-minute quota drain vs expected 5-hour window.",
        "severity": IncidentSeverity.HIGH,
        "started_at": datetime(2026, 3, 15, tzinfo=timezone.utc),
        "resolved_at": datetime(2026, 4, 15, tzinfo=timezone.utc),
        "affected_services": ["api", "claude_code", "console"],
        "affected_models": ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"],
        "is_active": False,
    },
    {
        "title": "Prompt caching cost anomaly",
        "description": "Bug in prompt caching caused tokens to be billed at full rate despite cache hits, inflating costs 10-20x for affected customers.",
        "severity": IncidentSeverity.CRITICAL,
        "started_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
        "resolved_at": datetime(2026, 4, 5, tzinfo=timezone.utc),
        "affected_services": ["api"],
        "affected_models": ["claude-sonnet-4-6", "claude-opus-4-6"],
        "is_active": False,
    },
]


def seed():
    """Seed the database with demo data."""
    init_db()
    session = get_session()

    # Check if already seeded
    if session.query(Customer).count() > 0:
        print("Database already seeded. Drop tables first to re-seed.")
        session.close()
        return

    print("Seeding customers...")
    customer_map = {}
    for i, c in enumerate(CUSTOMERS):
        customer = Customer(
            name=c["name"],
            company=c["company"],
            email=f"{c['name'].split()[0].lower()}@{c['company'].lower().replace(' ', '')}.com",
            segment=c["segment"],
            plan_tier=c["plan"],
            onboarding_stage=c["stage"],
            monthly_commitment=c["commitment"],
            seats=c["seats"],
            arr=c["arr"],
            health_status=HealthStatus.HEALTHY,
            health_score=random.randint(60, 100),
            metadata_={"profile": c["profile"]},
        )
        session.add(customer)
        session.flush()
        customer_map[i] = customer.id
        print(f"  + {c['company']} ({c['segment'].value})")

    print("\nSeeding usage events (90 days)...")
    total_events = 0
    for i, c in enumerate(CUSTOMERS):
        events = generate_usage(c, customer_map[i])
        for e in events:
            session.add(UsageEvent(**e))
        total_events += len(events)
        print(f"  + {c['company']}: {len(events)} events")

    print(f"\nSeeding {len(INCIDENTS)} incidents...")
    for inc in INCIDENTS:
        session.add(Incident(**inc))
        print(f"  + {inc['title'][:60]}...")

    session.commit()
    session.close()
    print(f"\nDone! {len(CUSTOMERS)} customers, {total_events} usage events, {len(INCIDENTS)} incidents.")


if __name__ == "__main__":
    seed()
