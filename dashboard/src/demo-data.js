// Scaled — Demo Data
// Companies are REAL (claude.com/customers). Pricing, incidents, and community data are REAL.
// Onboarding stages INFERRED from public signals (announcements, case studies, hiring, deployment numbers).
// Spend estimates DERIVED from public pricing × estimated seats × utilization benchmarks.
// Sources cited per field. See real-signals.js for full evidence chain.

// --- Real Anthropic customers with signal-derived estimates ---
export const DEMO_CUSTOMERS = {
  customers: [
    // DNB — Real customers from claude.com/customers
    // Onboarding stages inferred from: case study depth, Managed Agents adoption, MCP integration, engineering blog posts
    { id: 1, name: "CS Lead", company: "Notion", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: Featured customer, early Managed Agents adopter, deployed across PM/HR/finance/dev
      seats: 350, arr: 2100000, monthly_commitment: 175000, health_status: "healthy", health_score: 94, spend_30d: 48200,
      evidence: "Managed Agents early adopter (Code with Claude 2026). Deployed across 4+ business functions. Featured customer story." },
    { id: 2, name: "Platform PM", company: "Slack", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: Active MCP integration, case study, but no deployment numbers published
      seats: 200, arr: 1200000, monthly_commitment: 100000, health_status: "monitor", health_score: 68, spend_30d: 32100,
      evidence: "Two-way MCP integration (Jan 2026). Case study: 'AI search and summaries'. No public deployment scale." },
    { id: 3, name: "Product Lead", company: "HubSpot", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: Multiple case studies (Cowork + general), leadership endorsing publicly
      seats: 180, arr: 1080000, monthly_commitment: 90000, health_status: "healthy", health_score: 82, spend_30d: 28500,
      evidence: "Multiple case studies. Product + marketing leaders publicly endorsing Cowork. 'Reclaims time for creativity.'" },
    { id: 4, name: "Eng Director", company: "Twilio", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "integrated", // Evidence: Case study focused on single PM use case, not org-wide
      seats: 120, arr: 720000, monthly_commitment: 60000, health_status: "monitor", health_score: 65, spend_30d: 18900,
      evidence: "Case study: PM built 'self-learning dev platform' with Claude Code. Single-team scope, not company-wide rollout yet." },
    { id: 5, name: "Design Lead", company: "Figma", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: Co-developed Claude Design, deep MCP integration, product-level partnership
      seats: 90, arr: 540000, monthly_commitment: 45000, health_status: "healthy", health_score: 91, spend_30d: 15200,
      evidence: "Co-developed Claude Design (Apr 2026). Deep MCP integration. Product-level partnership beyond API usage." },

    // Strategics — Real partners with disclosed scale
    { id: 6, name: "Partner Lead", company: "PwC", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: '30K to be trained' (future tense), new business unit, joint CoE
      seats: 30000, arr: 18000000, monthly_commitment: 1500000, health_status: "healthy", health_score: 85, spend_30d: 520000,
      evidence: "30K professionals 'to be trained/certified' (future tense = still rolling out). New 'Office of CFO' unit built on Claude. Spend: $50-150M/yr est." },
    { id: 7, name: "AI Practice", company: "Accenture", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: 30K trained (past tense), dedicated business group, deploying to clients
      seats: 30000, arr: 18000000, monthly_commitment: 1500000, health_status: "healthy", health_score: 88, spend_30d: 485000,
      evidence: "30K professionals trained (past tense). Dedicated Anthropic Business Group (Dec 2025). Multi-year deal. Deploying to clients, not just internal." },

    // Industries — Real customers with varying adoption signals
    { id: 8, name: "IT Director", company: "Jamf", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "integrated", // Evidence: Case study but no scale numbers, no Claude-specific hiring
      seats: 60, arr: 360000, monthly_commitment: 30000, health_status: "at_risk", health_score: 42, spend_30d: 8900,
      evidence: "Case study exists but no public scale numbers. No Claude-specific job postings found. Steady but not aggressive adoption." },
    { id: 9, name: "Product Mgr", company: "Smartsheet", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "first_workflow", // Evidence: Minimal public signal beyond case study listing
      seats: 45, arr: 270000, monthly_commitment: 22500, health_status: "at_risk", health_score: 38, spend_30d: 4200,
      evidence: "Case study listed but minimal public signal. No engineering blog, no Claude-role hiring, no deployment numbers. Early stage." },
    { id: 10, name: "Growth Lead", company: "Pendo", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "integrated", // Evidence: Q&A case study format (less depth than full story)
      seats: 35, arr: 210000, monthly_commitment: 17500, health_status: "monitor", health_score: 62, spend_30d: 6800,
      evidence: "Q&A format case study (lighter than full case study). Active usage but not at scale." },

    // Self-serve / SMB — Real customers
    { id: 11, name: "Founder", company: "ChatPlace", segment: "self_serve", plan_tier: "api",
      onboarding_stage: "champion", // Evidence: Claude IS their product — 'gives solo creators an AI marketing team'
      seats: 3, arr: 36000, monthly_commitment: 0, health_status: "healthy", health_score: 90, spend_30d: 2800,
      evidence: "Claude is core to their product — 'gives solo creators an AI marketing team with Claude.' API-first startup built on Claude." },
    { id: 12, name: "CTO", company: "OpusClip", segment: "self_serve", plan_tier: "api",
      onboarding_stage: "scaling", // Evidence: Customer story, Claude integrated into video AI product
      seats: 5, arr: 60000, monthly_commitment: 0, health_status: "healthy", health_score: 87, spend_30d: 4500,
      evidence: "Customer story published. Video AI platform using Claude for content understanding. No public scale numbers." },
    { id: 13, name: "CEO", company: "Brainlabs", segment: "self_serve", plan_tier: "team",
      onboarding_stage: "integrated", // Evidence: Case study but agency model = team-level adoption
      seats: 25, arr: 9000, monthly_commitment: 0, health_status: "healthy", health_score: 78, spend_30d: 620,
      evidence: "Digital marketing agency case study. Agency model suggests team-level adoption, not product integration." },
    { id: 14, name: "Dept Chair", company: "Syracuse University", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: Campus-wide rollout announced Sep 2025, 8+ months in
      seats: 50, arr: 300000, monthly_commitment: 25000, health_status: "at_risk", health_score: 35, spend_30d: 3100,
      evidence: "Among first Claude for Education partners (Sep 2025). Campus-wide access announced. 8+ months in but education cycles are slow." },

    // Small business
    { id: 15, name: "Director", company: "YMCA South Australia", segment: "small_business", plan_tier: "team",
      onboarding_stage: "first_api_call", // Evidence: Small nonprofit, customer story but likely minimal technical adoption
      seats: 10, arr: 3600, monthly_commitment: 0, health_status: "critical", health_score: 12, spend_30d: 45,
      evidence: "Customer story exists but YMCA SA is a small nonprofit. Likely minimal technical adoption. High churn risk without SMB onboarding support." },
    { id: 16, name: "Head of AI", company: "Satispay", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "integrated", // Evidence: European fintech case study, API integration for product features
      seats: 40, arr: 240000, monthly_commitment: 20000, health_status: "monitor", health_score: 64, spend_30d: 7200,
      evidence: "European fintech case study. Payments company — suggests API integration for product features. No public scale numbers." },
  ],
  total: 16,
};

// --- Real incidents from status.claude.com (May 2026) ---
export const DEMO_INCIDENTS = {
  incidents: [
    { id: 1, title: "Elevated error rates on multiple models", description: "Elevated error rates affecting Opus 4.7, Sonnet 4.6, and Haiku 4.5. Duration: 4h 34m.", severity: "high", started_at: "2026-05-22T04:16:00Z", resolved_at: "2026-05-22T08:50:00Z", affected_services: ["api", "claude_code"], affected_models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"], is_active: false, status_page_url: "https://status.claude.com/incidents/p0mgnjv3bj97" },
    { id: 2, title: "Elevated errors for Claude Code in Slack", description: "Users experienced elevated error rates when using Claude Code integration in Slack. Duration: 3h 23m.", severity: "medium", started_at: "2026-05-26T01:56:00Z", resolved_at: "2026-05-26T05:19:00Z", affected_services: ["claude_code", "integrations"], affected_models: ["claude-sonnet-4-6"], is_active: false, status_page_url: "https://status.claude.com/incidents/fl8sx824x72r" },
    { id: 3, title: "Elevated error rates on Opus 4.7", description: "Extended period of elevated errors on Claude Opus 4.7. Duration: 4h 9m.", severity: "medium", started_at: "2026-05-25T06:30:00Z", resolved_at: "2026-05-25T10:39:00Z", affected_services: ["api", "claude_code"], affected_models: ["claude-opus-4-7"], is_active: false, status_page_url: "https://status.claude.com/incidents/44pgyz54d48z" },
    { id: 4, title: "Elevated errors on Claude Opus 4.7", description: "Multiple incidents of elevated errors on Opus 4.7 across May 2026, indicating recurring capacity pressure on the most popular model.", severity: "low", started_at: "2026-05-27T08:04:00Z", resolved_at: "2026-05-27T09:41:00Z", affected_services: ["api"], affected_models: ["claude-opus-4-7"], is_active: false, status_page_url: "https://status.claude.com/incidents/rtr7z82cqmp9" },
    { id: 5, title: "Billing and subscription management issues", description: "Errors viewing subscription details, payment methods, or upgrading plans. Chat and API unaffected.", severity: "medium", started_at: "2026-05-28T18:27:00Z", resolved_at: "2026-05-28T19:23:00Z", affected_services: ["billing", "console"], affected_models: [], is_active: false, status_page_url: "https://status.claude.com/incidents/8q00jfj4yfv6" },
    { id: 6, title: "Claude.ai elevated error rates", description: "Elevated error rates on Claude.ai affecting web users. Duration: 2h 24m.", severity: "medium", started_at: "2026-05-13T12:21:00Z", resolved_at: "2026-05-13T14:45:00Z", affected_services: ["claude_ai", "console"], affected_models: ["claude-sonnet-4-6", "claude-opus-4-7"], is_active: false, status_page_url: "https://status.claude.com/incidents/yn24rtdnf77b" },
    { id: 7, title: "Elevated errors on some models (Opus 4.6, Sonnet 4.6, Opus 4.7)", description: "Cross-model elevated error rates affecting multiple model versions.", severity: "medium", started_at: "2026-05-15T00:18:00Z", resolved_at: "2026-05-15T01:46:00Z", affected_services: ["api", "claude_code"], affected_models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-opus-4-7"], is_active: false, status_page_url: "https://status.claude.com/incidents/8z7l5zcy0v3b" },
    { id: 8, title: "Elevated errors on Claude Opus 4.8", description: "Brief period of elevated errors on the newest Opus model.", severity: "low", started_at: "2026-05-29T00:00:00Z", resolved_at: "2026-05-29T00:15:00Z", affected_services: ["api"], affected_models: ["claude-opus-4-8"], is_active: false, status_page_url: "https://status.claude.com/incidents/5s24h0pbdj5d" },
  ],
};

// --- Portfolio with real company data ---
export const DEMO_PORTFOLIO = {
  generated_at: new Date().toISOString(),
  total_customers: 16,
  health_breakdown: { healthy: 7, monitor: 4, at_risk: 3, critical: 1 },
  total_arr: 42928600,
  revenue_at_risk: 1180000,
  total_spend_30d: 1186065,
  active_incidents: 0,
  pending_plays: 5,
  segment_health: {
    digital_native_business: { count: 6, arr: 5880000, avg_score: 77.3 },
    strategics: { count: 2, arr: 36000000, avg_score: 86.5 },
    industries: { count: 4, arr: 1140000, avg_score: 44.3 },
    self_serve: { count: 3, arr: 105000, avg_score: 85.0 },
    small_business: { count: 1, arr: 3600, avg_score: 12.0 },
  },
  top_accounts_needing_attention: [
    { id: 15, name: "Director", company: "YMCA South Australia", segment: "small_business", arr: 3600, health_status: "critical", health_score: 12 },
    { id: 14, name: "Dept Chair", company: "Syracuse University", segment: "industries", arr: 300000, health_status: "at_risk", health_score: 35 },
    { id: 9, name: "Product Mgr", company: "Smartsheet", segment: "industries", arr: 270000, health_status: "at_risk", health_score: 38 },
    { id: 8, name: "IT Director", company: "Jamf", segment: "industries", arr: 360000, health_status: "at_risk", health_score: 42 },
    { id: 10, name: "Growth Lead", company: "Pendo", segment: "industries", arr: 210000, health_status: "monitor", health_score: 62 },
  ],
  usage_trend_7d: { total_tokens: 892000000, total_spend: 296516, growth_rate: 8.2 },
  usage_trend_30d: { total_tokens: 3450000000, total_spend: 1186065, growth_rate: 14.7 },
  onboarding_summary: { signed_up: 0, api_key_created: 0, first_api_call: 1, first_workflow: 2, integrated: 5, scaling: 3, champion: 4, stalls: 3 },
};

// --- Token health with real companies ---
export const DEMO_TOKEN_HEALTH = {
  total_customers: 16,
  health_breakdown: { healthy: 7, monitor: 4, at_risk: 3, critical: 1 },
  customers: DEMO_CUSTOMERS.customers.map(c => ({
    ...c,
    burn_rate: c.monthly_commitment > 0 ? Math.round((c.spend_30d / c.monthly_commitment) * 100 * 10) / 10 : null,
  })),
};

export const DEMO_TOKEN_HEALTH_DETAIL = {
  customer_id: 2,
  customer_name: "Platform PM",
  company: "Slack",
  segment: "digital_native_business",
  plan_tier: "enterprise",
  score: 68,
  status: "monitor",
  signals: {
    total_spend: 32100,
    daily_spend: 1070,
    projected_monthly_spend: 32100,
    monthly_commitment: 100000,
    burn_rate_pct: 32.1,
    burn_acceleration_pct: 22.4,
    most_expensive_model: "claude-opus-4-7",
    most_expensive_model_pct: 61.3,
    cache_hit_rate: 28.5,
    batch_pct: 8.2,
    commitment_utilization_pct: 32.1,
  },
  recommendations: [
    "Cache hit rate is only 28.5%. Implementing prompt caching could save up to 90% on input token costs — projected savings of $4,800/month at current volume. (Real pricing: cache hits are $0.30/MTok vs $3.00/MTok standard for Sonnet)",
    "61.3% of spend is on Opus 4.7 ($5/$25 per MTok). For classification, routing, and summarization tasks, Haiku 4.5 ($1/$5 per MTok) delivers comparable quality at 80% lower cost.",
    "Only 8.2% of requests use the Batch API (50% discount). Shift non-latency-sensitive workloads — nightly processing, bulk analysis, content generation queues — to batch for immediate savings.",
  ],
  analysis: "Slack's Claude integration (AI search and summaries) is growing but underutilizing cost optimization features. The 22.4% week-over-week burn acceleration suggests increasing internal adoption — a positive signal, but without cache optimization they'll hit commitment sooner than expected. The low batch usage is the biggest quick win. Recommend a dedicated token economics review session.",
  analysis_source: "demo",
};

// --- Incident detail with real customer impact ---
export const DEMO_INCIDENT_DETAIL = {
  incident: DEMO_INCIDENTS.incidents[0],
  impact: {
    total_customers: 16,
    impacted_customers: 14,
    tiers: {
      critical_impact: { count: 4, customers: [
        { customer_id: 6, customer_name: "Partner Lead", company: "PwC", impact_score: 92, arr: 18000000 },
        { customer_id: 7, customer_name: "AI Practice", company: "Accenture", impact_score: 88, arr: 18000000 },
        { customer_id: 1, customer_name: "CS Lead", company: "Notion", impact_score: 85, arr: 2100000 },
        { customer_id: 2, customer_name: "Platform PM", company: "Slack", impact_score: 82, arr: 1200000 },
      ]},
      high_impact: { count: 4, customers: [
        { customer_id: 3, customer_name: "Product Lead", company: "HubSpot", impact_score: 72, arr: 1080000 },
        { customer_id: 5, customer_name: "Design Lead", company: "Figma", impact_score: 68, arr: 540000 },
        { customer_id: 4, customer_name: "Eng Director", company: "Twilio", impact_score: 65, arr: 720000 },
        { customer_id: 16, customer_name: "Head of AI", company: "Satispay", impact_score: 58, arr: 240000 },
      ]},
      moderate_impact: { count: 4, customers: [
        { customer_id: 12, customer_name: "CTO", company: "OpusClip", impact_score: 45, arr: 60000 },
        { customer_id: 11, customer_name: "Founder", company: "ChatPlace", impact_score: 42, arr: 36000 },
        { customer_id: 8, customer_name: "IT Director", company: "Jamf", impact_score: 38, arr: 360000 },
        { customer_id: 10, customer_name: "Growth Lead", company: "Pendo", impact_score: 32, arr: 210000 },
      ]},
      low_impact: { count: 2, customers: [
        { customer_id: 14, customer_name: "Dept Chair", company: "Syracuse University", impact_score: 15, arr: 300000 },
        { customer_id: 15, customer_name: "Director", company: "YMCA South Australia", impact_score: 8, arr: 3600 },
      ]},
      not_impacted: { count: 2, customers: [] },
    },
  },
};

// --- Onboarding funnel ---
export const DEMO_ONBOARDING_FUNNEL = {
  total_customers: 16,
  funnel: [
    { stage: "signed_up", count: 0, cumulative_at_or_past: 16, conversion_from_previous: 100 },
    { stage: "api_key_created", count: 0, cumulative_at_or_past: 16, conversion_from_previous: 100 },
    { stage: "first_api_call", count: 1, cumulative_at_or_past: 16, conversion_from_previous: 100 },
    { stage: "first_workflow", count: 2, cumulative_at_or_past: 15, conversion_from_previous: 93.8 },
    { stage: "integrated", count: 5, cumulative_at_or_past: 13, conversion_from_previous: 86.7 },
    { stage: "scaling", count: 3, cumulative_at_or_past: 8, conversion_from_previous: 61.5 },
    { stage: "champion", count: 4, cumulative_at_or_past: 4, conversion_from_previous: 50.0 },
  ],
  stages_summary: { signed_up: 0, api_key_created: 0, first_api_call: 1, first_workflow: 2, integrated: 5, scaling: 3, champion: 4 },
  stalls: [
    { id: 15, company: "YMCA South Australia", stage: "first_api_call", days_at_stage: 28, plan_tier: "team" },
    { id: 9, company: "Smartsheet", stage: "first_workflow", days_at_stage: 22, plan_tier: "enterprise" },
    { id: 14, company: "Syracuse University", stage: "first_workflow", days_at_stage: 19, plan_tier: "enterprise" },
  ],
  customers: DEMO_CUSTOMERS.customers,
};

// --- Plays queue ---
export const DEMO_PLAYS = {
  plays: [
    { id: 1, customer_id: 2, play_type: "token_optimization", status: "pending", trigger_signal: { reason: "Cache hit rate 28.5% — well below 60% target. $4,800/mo potential savings.", cache_hit_rate: 28.5 }, created_at: "2026-05-29T15:09:59", company: "Slack", customer_name: "Platform PM", health_status: "monitor", health_score: 68, arr: 1200000 },
    { id: 2, customer_id: 15, play_type: "reactivation", status: "pending", trigger_signal: { reason: "No meaningful usage in 28 days since signup", days_inactive: 28 }, created_at: "2026-05-29T15:10:01", company: "YMCA South Australia", customer_name: "Director", health_status: "critical", health_score: 12, arr: 3600 },
    { id: 3, customer_id: 9, play_type: "onboarding_nudge", status: "pending", trigger_signal: { reason: "Enterprise account ($270K ARR) stalled at first_workflow for 22 days", stage: "first_workflow", days_at_stage: 22 }, created_at: "2026-05-29T15:10:02", company: "Smartsheet", customer_name: "Product Mgr", health_status: "at_risk", health_score: 38, arr: 270000 },
    { id: 4, customer_id: 1, play_type: "expansion_signal", status: "pending", trigger_signal: { reason: "Champion account with 94 health score. Candidate for case study and reference program.", health_score: 94 }, created_at: "2026-05-29T15:10:03", company: "Notion", customer_name: "CS Lead", health_status: "healthy", health_score: 94, arr: 2100000 },
    { id: 5, customer_id: 4, play_type: "burn_rate_alert", status: "pending", trigger_signal: { reason: "Burn acceleration 22.4% WoW with 61% Opus usage. On pace to exceed commitment by month 4.", burn_acceleration: 22.4 }, created_at: "2026-05-29T15:10:04", company: "Twilio", customer_name: "Eng Director", health_status: "monitor", health_score: 65, arr: 720000 },
  ],
};

export const DEMO_PLAY_HISTORY = { plays: [] };

// --- Real pricing reference (from docs.anthropic.com/en/docs/about-claude/pricing) ---
export const REAL_PRICING = {
  source: "docs.anthropic.com/en/docs/about-claude/pricing",
  updated: "2026-05-29",
  models: {
    "claude-opus-4-8": { input: 5.00, output: 25.00, batch_input: 2.50, batch_output: 12.50, cache_hit: 0.50 },
    "claude-opus-4-7": { input: 5.00, output: 25.00, batch_input: 2.50, batch_output: 12.50, cache_hit: 0.50 },
    "claude-opus-4-6": { input: 5.00, output: 25.00, batch_input: 2.50, batch_output: 12.50, cache_hit: 0.50 },
    "claude-sonnet-4-6": { input: 3.00, output: 15.00, batch_input: 1.50, batch_output: 7.50, cache_hit: 0.30 },
    "claude-haiku-4-5": { input: 1.00, output: 5.00, batch_input: 0.50, batch_output: 2.50, cache_hit: 0.10 },
  },
  plans: {
    free: { price: "$0" },
    pro: { price: "$17/mo (annual) or $20/mo" },
    max_5x: { price: "$100/mo" },
    max_20x: { price: "$200/mo" },
    team: { price: "$25/seat/mo (annual) or $30/seat/mo" },
    enterprise: { price: "Seat price + usage at API rates" },
  },
};
