// Static demo data for standalone dashboard deployment (no API required)
// This data mirrors what the seeded backend returns

export const DEMO_CUSTOMERS = {
  customers: [
    { id: 1, name: "Sarah Chen", company: "StreamScale AI", segment: "digital_native_business", plan_tier: "enterprise", onboarding_stage: "scaling", seats: 120, arr: 1020000, monthly_commitment: 85000, health_status: "monitor", health_score: 72, spend_30d: 988.48 },
    { id: 2, name: "Marcus Rivera", company: "DataPipe Labs", segment: "digital_native_business", plan_tier: "enterprise", onboarding_stage: "integrated", seats: 45, arr: 384000, monthly_commitment: 32000, health_status: "healthy", health_score: 85, spend_30d: 65.17 },
    { id: 3, name: "Priya Patel", company: "NexaFlow", segment: "digital_native_business", plan_tier: "team_premium", onboarding_stage: "first_workflow", seats: 18, arr: 27000, monthly_commitment: 0, health_status: "at_risk", health_score: 48, spend_30d: 12.30 },
    { id: 4, name: "James Okonkwo", company: "Veridia Health", segment: "digital_native_business", plan_tier: "enterprise", onboarding_stage: "champion", seats: 200, arr: 1800000, monthly_commitment: 150000, health_status: "healthy", health_score: 94, spend_30d: 2341.22 },
    { id: 5, name: "Elena Vasquez", company: "Fortuna Financial", segment: "strategics", plan_tier: "enterprise", onboarding_stage: "scaling", seats: 500, arr: 3000000, monthly_commitment: 250000, health_status: "monitor", health_score: 65, spend_30d: 4520.88 },
    { id: 6, name: "David Kim", company: "Meridian Systems", segment: "strategics", plan_tier: "enterprise", onboarding_stage: "champion", seats: 1200, arr: 4800000, monthly_commitment: 400000, health_status: "healthy", health_score: 88, spend_30d: 12450.33 },
    { id: 7, name: "Rachel Torres", company: "Pacific Coast Mfg", segment: "industries", plan_tier: "enterprise", onboarding_stage: "first_workflow", seats: 80, arr: 540000, monthly_commitment: 45000, health_status: "at_risk", health_score: 42, spend_30d: 89.40 },
    { id: 8, name: "Tom Nakamura", company: "Redwood Retail Group", segment: "industries", plan_tier: "team_standard", onboarding_stage: "first_api_call", seats: 25, arr: 7500, monthly_commitment: 0, health_status: "monitor", health_score: 60, spend_30d: 31.20 },
    { id: 9, name: "Alex Novak", company: "Indie Dev Shop", segment: "self_serve", plan_tier: "api", onboarding_stage: "scaling", seats: 1, arr: 2400, monthly_commitment: 0, health_status: "healthy", health_score: 90, spend_30d: 187.50 },
    { id: 10, name: "Maya Washington", company: "ContentForge", segment: "self_serve", plan_tier: "pro", onboarding_stage: "first_api_call", seats: 1, arr: 240, monthly_commitment: 0, health_status: "critical", health_score: 15, spend_30d: 0.80 },
    { id: 11, name: "Jordan Liu", company: "QuantumLeap Analytics", segment: "self_serve", plan_tier: "max_200", onboarding_stage: "integrated", seats: 1, arr: 2400, monthly_commitment: 0, health_status: "healthy", health_score: 82, spend_30d: 145.60 },
    { id: 12, name: "Casey Murphy", company: "BuildRight Contractors", segment: "small_business", plan_tier: "team_standard", onboarding_stage: "signed_up", seats: 8, arr: 2400, monthly_commitment: 0, health_status: "critical", health_score: 10, spend_30d: 0 },
    { id: 13, name: "Lin Zhang", company: "ZhangML Consulting", segment: "self_serve", plan_tier: "api", onboarding_stage: "scaling", seats: 1, arr: 12000, monthly_commitment: 0, health_status: "healthy", health_score: 88, spend_30d: 890.20 },
    { id: 14, name: "Sofia Andersson", company: "Nordic Code Labs", segment: "self_serve", plan_tier: "team_premium", onboarding_stage: "integrated", seats: 5, arr: 7500, monthly_commitment: 0, health_status: "healthy", health_score: 78, spend_30d: 210.40 },
    { id: 15, name: "Raj Mehta", company: "FinBot Solutions", segment: "digital_native_business", plan_tier: "enterprise", onboarding_stage: "integrated", seats: 60, arr: 660000, monthly_commitment: 55000, health_status: "monitor", health_score: 68, spend_30d: 445.90 },
    { id: 16, name: "Amy Brennan", company: "LegalEdge AI", segment: "industries", plan_tier: "enterprise", onboarding_stage: "first_workflow", seats: 35, arr: 336000, monthly_commitment: 28000, health_status: "at_risk", health_score: 38, spend_30d: 52.10 },
  ],
  total: 16,
};

export const DEMO_PORTFOLIO = {
  generated_at: new Date().toISOString(),
  total_customers: 16,
  health_breakdown: { healthy: 8, monitor: 4, at_risk: 3, critical: 1 },
  total_arr: 12601440,
  revenue_at_risk: 903240,
  total_spend_30d: 22441.48,
  active_incidents: 0,
  pending_plays: 5,
  segment_health: {
    digital_native_business: { count: 5, arr: 3891000, avg_score: 73.4 },
    strategics: { count: 2, arr: 7800000, avg_score: 76.5 },
    industries: { count: 3, arr: 883500, avg_score: 46.7 },
    self_serve: { count: 5, arr: 24540, avg_score: 70.6 },
    small_business: { count: 1, arr: 2400, avg_score: 10 },
  },
  top_accounts_needing_attention: [
    { id: 12, name: "Casey Murphy", company: "BuildRight Contractors", segment: "small_business", arr: 2400, health_status: "critical", health_score: 10 },
    { id: 10, name: "Maya Washington", company: "ContentForge", segment: "self_serve", arr: 240, health_status: "critical", health_score: 15 },
    { id: 16, name: "Amy Brennan", company: "LegalEdge AI", segment: "industries", arr: 336000, health_status: "at_risk", health_score: 38 },
    { id: 7, name: "Rachel Torres", company: "Pacific Coast Mfg", segment: "industries", arr: 540000, health_status: "at_risk", health_score: 42 },
    { id: 3, name: "Priya Patel", company: "NexaFlow", segment: "digital_native_business", arr: 27000, health_status: "at_risk", health_score: 48 },
  ],
  usage_trend_7d: { total_tokens: 45200000, total_spend: 5610.37, growth_rate: 12.4 },
  usage_trend_30d: { total_tokens: 178500000, total_spend: 22441.48, growth_rate: 8.7 },
  onboarding_summary: { signed_up: 1, api_key_created: 0, first_api_call: 2, first_workflow: 3, integrated: 4, scaling: 4, champion: 2, stalls: 3 },
};

export const DEMO_TOKEN_HEALTH = {
  total_customers: 16,
  health_breakdown: { healthy: 8, monitor: 4, at_risk: 3, critical: 1 },
  customers: DEMO_CUSTOMERS.customers.map(c => ({
    ...c,
    burn_rate: c.monthly_commitment > 0 ? Math.round((c.spend_30d / c.monthly_commitment) * 100 * 10) / 10 : null,
  })),
};

export const DEMO_TOKEN_HEALTH_DETAIL = {
  customer_id: 1,
  customer_name: "Sarah Chen",
  company: "StreamScale AI",
  segment: "digital_native_business",
  plan_tier: "enterprise",
  score: 72,
  status: "monitor",
  signals: {
    total_spend: 988.48,
    daily_spend: 34.09,
    projected_monthly_spend: 1022.70,
    monthly_commitment: 85000,
    burn_rate_pct: 1.2,
    burn_acceleration_pct: 18.4,
    most_expensive_model: "claude-sonnet-4-6",
    most_expensive_model_pct: 52.4,
    cache_hit_rate: 37.1,
    batch_pct: 11.5,
    commitment_utilization_pct: 1.16,
  },
  recommendations: [
    "Cache hit rate is only 37.1%. Implementing prompt caching could save up to 90% on input token costs — projected savings of $180/month at current volume.",
    "52.4% of spend is on Sonnet. For classification and routing tasks, switch to Haiku to cut costs by 67% on those workloads.",
    "Only 11.5% of requests use the Batch API. Shift non-latency-sensitive workloads (nightly processing, bulk analysis) to batch for 50% savings.",
  ],
  analysis: "StreamScale AI is a heavy Claude Code user (69% of spend) with growing usage patterns. While current spend is well under their $85K commitment, the low cache hit rate (37.1%) and minimal batch usage suggest significant optimization opportunities. The burn acceleration of 18.4% week-over-week warrants monitoring — if this trajectory continues, they'll hit commitment utilization faster than expected. Recommend proactive optimization guidance now to build trust before costs escalate.",
  analysis_source: "demo",
};

export const DEMO_INCIDENTS = {
  incidents: [
    { id: 1, title: "Claude Code reasoning effort degradation", description: "Default reasoning effort switched from high to medium, causing reduced code quality and increased error rates for Claude Code users.", severity: "high", started_at: "2026-03-04T00:00:00", resolved_at: "2026-03-18T00:00:00", affected_services: ["claude_code"], affected_models: ["claude-sonnet-4-6"], is_active: false },
    { id: 2, title: "Context caching bug — thinking sections cleared", description: "Optimization cleared thinking/reasoning sections on every conversation turn instead of once, leaving Claude without prior context in long sessions.", severity: "critical", started_at: "2026-03-26T00:00:00", resolved_at: "2026-04-10T00:00:00", affected_services: ["api", "claude_code"], affected_models: ["claude-sonnet-4-6", "claude-opus-4-6"], is_active: false },
    { id: 3, title: "Peak-hour capacity throttling", description: "Intentional capacity reduction during high-demand periods causing increased latency and quota exhaustion.", severity: "high", started_at: "2026-03-15T00:00:00", resolved_at: "2026-04-15T00:00:00", affected_services: ["api", "claude_code", "console"], affected_models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"], is_active: false },
    { id: 4, title: "Prompt caching cost anomaly", description: "Bug in prompt caching caused tokens to be billed at full rate despite cache hits, inflating costs 10-20x for affected customers.", severity: "critical", started_at: "2026-03-20T00:00:00", resolved_at: "2026-04-05T00:00:00", affected_services: ["api"], affected_models: ["claude-sonnet-4-6", "claude-opus-4-6"], is_active: false },
  ],
};

export const DEMO_INCIDENT_DETAIL = {
  incident: DEMO_INCIDENTS.incidents[1],
  impact: {
    total_customers: 16,
    impacted_customers: 14,
    tiers: {
      critical_impact: { count: 6, customers: [
        { customer_id: 1, customer_name: "Sarah Chen", company: "StreamScale AI", impact_score: 85, arr: 1020000 },
        { customer_id: 6, customer_name: "David Kim", company: "Meridian Systems", impact_score: 82, arr: 4800000 },
        { customer_id: 4, customer_name: "James Okonkwo", company: "Veridia Health", impact_score: 78, arr: 1800000 },
        { customer_id: 15, customer_name: "Raj Mehta", company: "FinBot Solutions", impact_score: 75, arr: 660000 },
        { customer_id: 13, customer_name: "Lin Zhang", company: "ZhangML Consulting", impact_score: 72, arr: 12000 },
        { customer_id: 5, customer_name: "Elena Vasquez", company: "Fortuna Financial", impact_score: 70, arr: 3000000 },
      ]},
      high_impact: { count: 4, customers: [
        { customer_id: 2, customer_name: "Marcus Rivera", company: "DataPipe Labs", impact_score: 58, arr: 384000 },
        { customer_id: 14, customer_name: "Sofia Andersson", company: "Nordic Code Labs", impact_score: 52, arr: 7500 },
        { customer_id: 11, customer_name: "Jordan Liu", company: "QuantumLeap Analytics", impact_score: 48, arr: 2400 },
        { customer_id: 9, customer_name: "Alex Novak", company: "Indie Dev Shop", impact_score: 45, arr: 2400 },
      ]},
      moderate_impact: { count: 3, customers: [
        { customer_id: 7, customer_name: "Rachel Torres", company: "Pacific Coast Mfg", impact_score: 32, arr: 540000 },
        { customer_id: 16, customer_name: "Amy Brennan", company: "LegalEdge AI", impact_score: 28, arr: 336000 },
        { customer_id: 8, customer_name: "Tom Nakamura", company: "Redwood Retail Group", impact_score: 22, arr: 7500 },
      ]},
      low_impact: { count: 1, customers: [
        { customer_id: 3, customer_name: "Priya Patel", company: "NexaFlow", impact_score: 12, arr: 27000 },
      ]},
      not_impacted: { count: 2, customers: [] },
    },
  },
};

export const DEMO_ONBOARDING_FUNNEL = {
  total_customers: 16,
  funnel: [
    { stage: "signed_up", count: 1, cumulative_at_or_past: 16, conversion_from_previous: 100 },
    { stage: "api_key_created", count: 0, cumulative_at_or_past: 15, conversion_from_previous: 93.8 },
    { stage: "first_api_call", count: 2, cumulative_at_or_past: 15, conversion_from_previous: 100 },
    { stage: "first_workflow", count: 3, cumulative_at_or_past: 13, conversion_from_previous: 86.7 },
    { stage: "integrated", count: 4, cumulative_at_or_past: 10, conversion_from_previous: 76.9 },
    { stage: "scaling", count: 4, cumulative_at_or_past: 6, conversion_from_previous: 60 },
    { stage: "champion", count: 2, cumulative_at_or_past: 2, conversion_from_previous: 33.3 },
  ],
  stages_summary: { signed_up: 1, api_key_created: 0, first_api_call: 2, first_workflow: 3, integrated: 4, scaling: 4, champion: 2 },
  stalls: [
    { id: 12, company: "BuildRight Contractors", stage: "signed_up", days_at_stage: 22, plan_tier: "team_standard" },
    { id: 10, company: "ContentForge", stage: "first_api_call", days_at_stage: 18, plan_tier: "pro" },
    { id: 7, company: "Pacific Coast Mfg", stage: "first_workflow", days_at_stage: 31, plan_tier: "enterprise" },
  ],
  customers: DEMO_CUSTOMERS.customers,
};

export const DEMO_PLAYS = {
  plays: [
    { id: 1, customer_id: 1, play_type: "expansion_signal", status: "pending", trigger_signal: { spend_30d: 988.48, spend_prior_30d: 487.25, mom_growth_pct: 102.87 }, created_at: "2026-05-29T15:09:59", company: "StreamScale AI", customer_name: "Sarah Chen", health_status: "monitor", health_score: 72, arr: 1020000 },
    { id: 2, customer_id: 12, play_type: "reactivation", status: "pending", trigger_signal: { reason: "No usage in 22 days", days_inactive: 22 }, created_at: "2026-05-29T15:10:01", company: "BuildRight Contractors", customer_name: "Casey Murphy", health_status: "critical", health_score: 10, arr: 2400 },
    { id: 3, customer_id: 10, play_type: "onboarding_nudge", status: "pending", trigger_signal: { reason: "Stalled at first_api_call for 18 days", stage: "first_api_call", days_at_stage: 18 }, created_at: "2026-05-29T15:10:02", company: "ContentForge", customer_name: "Maya Washington", health_status: "critical", health_score: 15, arr: 240 },
    { id: 4, customer_id: 7, play_type: "onboarding_nudge", status: "pending", trigger_signal: { reason: "Stalled at first_workflow for 31 days", stage: "first_workflow", days_at_stage: 31 }, created_at: "2026-05-29T15:10:03", company: "Pacific Coast Mfg", customer_name: "Rachel Torres", health_status: "at_risk", health_score: 42, arr: 540000 },
    { id: 5, customer_id: 3, play_type: "token_optimization", status: "pending", trigger_signal: { reason: "82% of spend on Opus for tasks Haiku could handle", opus_pct: 82 }, created_at: "2026-05-29T15:10:04", company: "NexaFlow", customer_name: "Priya Patel", health_status: "at_risk", health_score: 48, arr: 27000 },
  ],
};

export const DEMO_PLAY_HISTORY = {
  plays: [],
};
