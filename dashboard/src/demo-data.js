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
      onboarding_stage: "champion", // Evidence: Deep MCP + Claude Code in Slack (Dec 2025), Agentforce 360 co-announcement
      seats: 200, arr: 1200000, monthly_commitment: 100000, health_status: "healthy", health_score: 86, spend_30d: 32100,
      evidence: "Deep strategic partnership via Salesforce. Claude Apps for Slack (Jan 2026). Claude Code in Slack (Dec 2025). Two-way MCP. Agentforce 360 co-announcement." },
    { id: 3, name: "Product Lead", company: "HubSpot", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: Multiple case studies (Cowork + general), leadership endorsing publicly
      seats: 180, arr: 1080000, monthly_commitment: 90000, health_status: "healthy", health_score: 82, spend_30d: 28500,
      evidence: "Multiple case studies. Product + marketing leaders publicly endorsing Cowork. 'Reclaims time for creativity.'" },
    { id: 4, name: "Eng Director", company: "Twilio", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: MCP + Skills + ConversationRelay launched May 2026, multiple integration paths
      seats: 120, arr: 720000, monthly_commitment: 60000, health_status: "monitor", health_score: 65, spend_30d: 18900,
      evidence: "Twilio Connector + Claude Code plugin (May 2026, Code with Claude conf). MCP Skills, ConversationRelay voice integration. Multiple engineering blog posts." },
    { id: 5, name: "Design Lead", company: "Figma", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: Co-developed Claude Design, deep MCP integration, product-level partnership
      seats: 90, arr: 540000, monthly_commitment: 45000, health_status: "healthy", health_score: 91, spend_30d: 15200,
      evidence: "Co-developed Claude Design (Apr 2026). Deep MCP integration. Product-level partnership beyond API usage." },

    // Strategics — Real partners with disclosed scale
    { id: 6, name: "Partner Lead", company: "PwC", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: 30K certifications, expanding to 364K global, new business unit, production use cases
      seats: 30000, arr: 18000000, monthly_commitment: 1500000, health_status: "healthy", health_score: 90, spend_30d: 520000,
      evidence: "Expanded alliance May 2026. 30K certified, extending to 364K global. Production: sports ops, insurance, mainframe modernization, HR, cybersecurity. 70% delivery improvement." },
    { id: 7, name: "AI Practice", company: "Accenture", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: 30K trained (past tense), dedicated business group, deploying to clients
      seats: 30000, arr: 18000000, monthly_commitment: 1500000, health_status: "healthy", health_score: 88, spend_30d: 485000,
      evidence: "30K professionals trained (past tense). Dedicated Anthropic Business Group (Dec 2025). Multi-year deal. Deploying to clients, not just internal." },

    // Industries — Real customers with varying adoption signals
    { id: 8, name: "IT Director", company: "Jamf", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "integrated", // Evidence: Claude Enterprise across all 16 departments, performance reviews, vendor reviews, incident response
      seats: 60, arr: 360000, monthly_commitment: 30000, health_status: "healthy", health_score: 72, spend_30d: 8900,
      evidence: "Claude Enterprise across all 16 departments. Performance review compressed to 45-min guided self-eval. Extended to vendor reviews + incident response. Non-engineering teams driving broadest adoption." },
    { id: 9, name: "Product Mgr", company: "Smartsheet", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: 4,000 users + 1.74M actions in first week of MCP connector GA (Mar 2026)
      seats: 45, arr: 270000, monthly_commitment: 22500, health_status: "healthy", health_score: 76, spend_30d: 12400,
      evidence: "MCP connector GA Mar 2, 2026. 4,000 users with 1.74M total actions in first week. Read + write actions. Standalone MCP server also launched." },
    { id: 10, name: "Growth Lead", company: "Pendo", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "first_workflow", // Evidence: Just a connector directory listing (Feb 2026), no deep integration
      seats: 35, arr: 210000, monthly_commitment: 17500, health_status: "monitor", health_score: 55, spend_30d: 6800,
      evidence: "Joined Claude Connectors Directory ~Feb 2026. MCP server for product analytics queries. No published case study, no co-engineering. Connector-level presence only." },

    // Self-serve / SMB — Real customers
    { id: 11, name: "Founder", company: "ChatPlace", segment: "self_serve", plan_tier: "api",
      onboarding_stage: "integrated", // Evidence: Claude as reasoning engine for Instagram DM automation, API-level integration
      seats: 3, arr: 36000, monthly_commitment: 0, health_status: "healthy", health_score: 85, spend_30d: 2800,
      evidence: "Claude as reasoning engine for Instagram DM chatbots. Reads intent, handles objections, qualifies leads. API-level product integration. Case study May 2026." },
    { id: 12, name: "CTO", company: "OpusClip", segment: "self_serve", plan_tier: "api",
      onboarding_stage: "integrated", // Evidence: Claude Code for call intelligence, $200K+ pipeline identified, non-coders building production tools
      seats: 5, arr: 60000, monthly_commitment: 0, health_status: "healthy", health_score: 87, spend_30d: 4500,
      evidence: "B2B revenue team uses Claude Code. 100% call review coverage (up from 5-10%). $200K+ new pipeline identified. ROI calculator built in 60 min. Planning proactive agents next." },
    { id: 13, name: "CEO", company: "Brainlabs", segment: "self_serve", plan_tier: "team",
      onboarding_stage: "champion", // Evidence: Full workforce rollout (~1,000 employees), 400 skills in 4 weeks, governance model
      seats: 1000, arr: 360000, monthly_commitment: 0, health_status: "healthy", health_score: 92, spend_30d: 28000,
      evidence: "Claude Cowork rolled out to full 1,000-person workforce in 4 weeks. 400 skills authored by employees. Notion-based skill library. Designated skill owners governance model." },
    { id: 14, name: "Dept Chair", company: "Syracuse University", segment: "industries", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Evidence: Campus-wide rollout announced Sep 2025, 8+ months in
      seats: 50, arr: 300000, monthly_commitment: 25000, health_status: "at_risk", health_score: 35, spend_30d: 3100,
      evidence: "Among first Claude for Education partners (Sep 2025). Campus-wide access announced. 8+ months in but education cycles are slow." },

    // Small business
    { id: 15, name: "Head of Marketing", company: "YMCA South Australia", segment: "small_business", plan_tier: "team",
      onboarding_stage: "integrated", // Evidence: 65+ locations, 1,250 staff, custom AI skills, replaced external contractors
      seats: 15, arr: 5400, monthly_commitment: 0, health_status: "healthy", health_score: 70, spend_30d: 380,
      evidence: "Claude for Nonprofits partner. 65+ locations, ~1,250 staff. Custom AI skills for ops data analysis + branded content (hours→minutes). Replaced external contractors. ANZ expansion partner (Apr 2026)." },
    { id: 16, name: "Head of AI", company: "Satispay", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "champion", // Evidence: 75% of code via Claude, 90%+ engineer adoption in 30 days, 18mo roadmap in 7mo
      seats: 80, arr: 480000, monthly_commitment: 40000, health_status: "healthy", health_score: 93, spend_30d: 14200,
      evidence: "75%+ of monthly code produced with Claude. 90%+ engineers use Claude as standard tool. 90% adoption in 30 days. 18-month roadmap compressed to 7 months. Named customer at Anthropic Milan office opening (May 28, 2026)." },

    // At-risk / Churn signals — REAL public churn data
    { id: 17, name: "Founder", company: "Retool", segment: "digital_native_business", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Was scaling, now churning
      seats: 100, arr: 600000, monthly_commitment: 50000, health_status: "critical", health_score: 8, spend_30d: 2100,
      evidence: "CONFIRMED CHURN. Founder David Hsu publicly switched to OpenAI. Cited 98.95% API uptime vs 99.99% industry standard. Preferred Claude quality but couldn't ship code when it went down." },
    { id: 18, name: "CTO", company: "Uber", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Active but at risk from budget blowout
      seats: 5000, arr: 60000000, monthly_commitment: 5000000, health_status: "at_risk", health_score: 32, spend_30d: 8500000,
      evidence: "BUDGET RISK. 5,000 engineers, 84-95% adoption. $500-$2K/engineer/month. CTO reported burning entire $3.4B 2026 AI budget in 4 months. Spend trajectory unsustainable without optimization." },
    { id: 19, name: "Eng VP", company: "Microsoft", segment: "strategics", plan_tier: "enterprise",
      onboarding_stage: "scaling", // Active but being displaced
      seats: 2000, arr: 12000000, monthly_commitment: 1000000, health_status: "critical", health_score: 15, spend_30d: 180000,
      evidence: "COMPETITIVE DISPLACEMENT. Cancelled most Claude Code licenses across Experiences & Devices division (Windows, M365, Outlook, Teams, Surface). June 30, 2026 deadline. Directed to GitHub Copilot CLI. Not quality churn — engineers used it too much." },
  ],
  total: 19,
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
  total_customers: 19,
  health_breakdown: { healthy: 13, monitor: 2, at_risk: 1, critical: 2 },
  total_arr: 115614400,
  revenue_at_risk: 72600000,
  total_spend_30d: 9910300,
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
    { id: 17, name: "Founder", company: "Retool", segment: "digital_native_business", arr: 600000, health_status: "critical", health_score: 8, evidence: "CONFIRMED CHURN: Switched to OpenAI over 98.95% uptime" },
    { id: 19, name: "Eng VP", company: "Microsoft", segment: "strategics", arr: 12000000, health_status: "critical", health_score: 15, evidence: "COMPETITIVE DISPLACEMENT: Claude Code licenses cancelled, switching to GitHub Copilot CLI" },
    { id: 18, name: "CTO", company: "Uber", segment: "strategics", arr: 60000000, health_status: "at_risk", health_score: 32, evidence: "BUDGET RISK: Burned $3.4B AI budget in 4 months on Claude Code" },
    { id: 10, name: "Growth Lead", company: "Pendo", segment: "industries", arr: 210000, health_status: "monitor", health_score: 55, evidence: "Connector-only presence, no deep integration signals" },
    { id: 4, name: "Eng Director", company: "Twilio", segment: "digital_native_business", arr: 720000, health_status: "monitor", health_score: 65, evidence: "Launched May 2026 — very new, needs activation monitoring" },
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
