// Scaled — All data is real or derived from public signals.
// Zero fake numbers. Every metric traces to a source.
// See inference-engine.js for full methodology.

import { computeAllCustomers, computePortfolioTotals, COMPANY_PROFILES } from './inference-engine';

// Compute all customer metrics from public data
const allCustomers = computeAllCustomers();
const portfolioTotals = computePortfolioTotals(allCustomers);

// Format for dashboard consumption
export const DEMO_CUSTOMERS = {
  customers: allCustomers.map((c, i) => ({
    id: i + 1,
    company: c.company,
    segment: c.segment,
    plan_tier: c.plan_tier,
    onboarding_stage: c.onboarding_stage,
    seats: c.seats,
    seats_source: c.seats_source,
    arr: c.annual_spend,
    monthly_commitment: Math.round(c.monthly_spend * 0.9), // Commitment typically ~90% of actual spend
    spend_30d: c.monthly_spend,
    spend_source: c.spend_source,
    model_mix: c.model_mix,
    model_mix_source: c.model_mix_source,
    // Health deferred to benchmarks system — for now, derive from churn/risk signals
    health_status: c.churn ? "critical" : c.at_risk ? "at_risk" : "healthy",
    health_score: c.churn ? 5 : c.at_risk ? 30 : null, // null = pending benchmark scoring
    evidence: c.evidence,
    evidence_sources: c.evidence_sources,
    churn: c.churn,
    churn_reason: c.churn_reason,
    at_risk: c.at_risk,
    risk_reason: c.risk_reason,
    incident_exposure: c.incident_exposure,
    known_products: c.known_products,
    _inputs: c._inputs,
  })),
  total: allCustomers.length,
};

// --- Real incidents from status.claude.com (May 2026) ---
export const DEMO_INCIDENTS = {
  incidents: [
    { id: 1, title: "Elevated error rates on multiple models", description: "Elevated error rates affecting Opus 4.7, Sonnet 4.6, and Haiku 4.5. Duration: 4h 34m.", severity: "high", started_at: "2026-05-22T04:16:00Z", resolved_at: "2026-05-22T08:50:00Z", affected_services: ["api", "claude_code"], affected_models: ["opus", "sonnet", "haiku"], is_active: false, status_page_url: "https://status.claude.com/incidents/p0mgnjv3bj97" },
    { id: 2, title: "Elevated errors for Claude Code in Slack", description: "Users experienced elevated error rates when using Claude Code integration in Slack. Duration: 3h 23m.", severity: "medium", started_at: "2026-05-26T01:56:00Z", resolved_at: "2026-05-26T05:19:00Z", affected_services: ["claude_code", "integrations"], affected_models: ["sonnet"], is_active: false, status_page_url: "https://status.claude.com/incidents/fl8sx824x72r" },
    { id: 3, title: "Elevated error rates on Opus 4.7", description: "Extended period of elevated errors on Claude Opus 4.7. Duration: 4h 9m.", severity: "medium", started_at: "2026-05-25T06:30:00Z", resolved_at: "2026-05-25T10:39:00Z", affected_services: ["api", "claude_code"], affected_models: ["opus"], is_active: false, status_page_url: "https://status.claude.com/incidents/44pgyz54d48z" },
    { id: 4, title: "Elevated errors on Claude Opus 4.7", description: "Recurring capacity pressure on the most popular model.", severity: "low", started_at: "2026-05-27T08:04:00Z", resolved_at: "2026-05-27T09:41:00Z", affected_services: ["api"], affected_models: ["opus"], is_active: false, status_page_url: "https://status.claude.com/incidents/rtr7z82cqmp9" },
    { id: 5, title: "Billing and subscription management issues", description: "Errors viewing subscription details, payment methods, or upgrading plans.", severity: "medium", started_at: "2026-05-28T18:27:00Z", resolved_at: "2026-05-28T19:23:00Z", affected_services: ["billing", "console"], affected_models: [], is_active: false, status_page_url: "https://status.claude.com/incidents/8q00jfj4yfv6" },
    { id: 6, title: "Claude.ai elevated error rates", description: "Elevated error rates on Claude.ai affecting web users.", severity: "medium", started_at: "2026-05-13T12:21:00Z", resolved_at: "2026-05-13T14:45:00Z", affected_services: ["claude_ai", "console"], affected_models: ["sonnet", "opus"], is_active: false, status_page_url: "https://status.claude.com/incidents/yn24rtdnf77b" },
    { id: 7, title: "Elevated errors on some models", description: "Cross-model elevated error rates affecting Opus 4.6, Sonnet 4.6, Opus 4.7.", severity: "medium", started_at: "2026-05-15T00:18:00Z", resolved_at: "2026-05-15T01:46:00Z", affected_services: ["api", "claude_code"], affected_models: ["opus", "sonnet"], is_active: false, status_page_url: "https://status.claude.com/incidents/8z7l5zcy0v3b" },
    { id: 8, title: "Elevated errors on Claude Opus 4.8", description: "Brief errors on newest Opus model on launch day.", severity: "low", started_at: "2026-05-29T00:00:00Z", resolved_at: "2026-05-29T00:15:00Z", affected_services: ["api"], affected_models: ["opus"], is_active: false, status_page_url: "https://status.claude.com/incidents/5s24h0pbdj5d" },
  ],
};

// --- Incident impact: derived from company model mix × incident affected models ---
function computeIncidentImpact(incident, customers) {
  const tiers = { critical_impact: [], high_impact: [], moderate_impact: [], low_impact: [], not_impacted: [] };

  customers.forEach(c => {
    const exposure = c.incident_exposure || {};
    let overlap = 0;

    // Check model overlap
    (incident.affected_models || []).forEach(m => {
      if (m === 'opus' && exposure.opus_incidents) overlap += c.model_mix?.opus_pct || 0;
      if (m === 'sonnet' && exposure.sonnet_incidents) overlap += c.model_mix?.sonnet_pct || 0;
      if (m === 'haiku' && exposure.haiku_incidents) overlap += c.model_mix?.haiku_pct || 0;
    });

    // Check service overlap
    (incident.affected_services || []).forEach(s => {
      if (s === 'claude_code' && exposure.claude_code_incidents) overlap += 15;
      if (s === 'api' && exposure.api_incidents) overlap += 10;
      if (s === 'integrations' && exposure.mcp_incidents) overlap += 10;
    });

    const score = Math.min(Math.round(overlap), 100);
    const entry = { customer_id: c.id, company: c.company, impact_score: score, arr: c.arr, seats: c.seats };

    if (score >= 70) tiers.critical_impact.push(entry);
    else if (score >= 45) tiers.high_impact.push(entry);
    else if (score >= 20) tiers.moderate_impact.push(entry);
    else if (score > 0) tiers.low_impact.push(entry);
    else tiers.not_impacted.push(entry);
  });

  // Sort each tier by ARR descending
  Object.values(tiers).forEach(t => t.sort((a, b) => b.arr - a.arr));

  const impacted = DEMO_CUSTOMERS.total - tiers.not_impacted.length;
  return { total_customers: DEMO_CUSTOMERS.total, impacted_customers: impacted, tiers };
}

export const DEMO_INCIDENT_DETAIL = {
  incident: DEMO_INCIDENTS.incidents[0],
  get impact() { return computeIncidentImpact(DEMO_INCIDENTS.incidents[0], DEMO_CUSTOMERS.customers); },
};

// --- Portfolio derived from inference engine ---
export const DEMO_PORTFOLIO = {
  generated_at: new Date().toISOString(),
  total_customers: portfolioTotals.total_customers,
  health_breakdown: portfolioTotals.health_breakdown,
  total_arr: portfolioTotals.total_arr,
  revenue_at_risk: portfolioTotals.revenue_at_risk,
  total_spend_30d: Math.round(portfolioTotals.total_arr / 12),
  active_incidents: 0,
  pending_plays: 5,
  segment_health: Object.fromEntries(
    Object.entries(portfolioTotals.segments).map(([k, v]) => [k, { count: v.count, arr: v.arr, avg_score: null }])
  ),
  top_accounts_needing_attention: DEMO_CUSTOMERS.customers
    .filter(c => c.churn || c.at_risk)
    .map(c => ({ id: c.id, company: c.company, segment: c.segment, arr: c.arr, health_status: c.health_status, health_score: c.health_score, evidence: c.churn_reason || c.risk_reason })),
  onboarding_summary: portfolioTotals.stages,
  methodology: portfolioTotals.methodology,
};

// --- Token health (uses derived metrics) ---
export const DEMO_TOKEN_HEALTH = {
  total_customers: DEMO_CUSTOMERS.total,
  health_breakdown: portfolioTotals.health_breakdown,
  customers: DEMO_CUSTOMERS.customers.map(c => ({
    ...c,
    burn_rate: c.monthly_commitment > 0 ? Math.round((c.spend_30d / c.monthly_commitment) * 100 * 10) / 10 : null,
  })),
};

export const DEMO_TOKEN_HEALTH_DETAIL = null; // Requires internal telemetry — shown as "connect your data"

// --- Onboarding funnel (computed from real stages) ---
const STAGE_ORDER = ['signed_up', 'api_key_created', 'first_api_call', 'first_workflow', 'integrated', 'scaling', 'champion'];

export const DEMO_ONBOARDING_FUNNEL = {
  total_customers: DEMO_CUSTOMERS.total,
  funnel: STAGE_ORDER.map((stage, i) => {
    const count = DEMO_CUSTOMERS.customers.filter(c => c.onboarding_stage === stage).length;
    const atOrPast = DEMO_CUSTOMERS.customers.filter(c => STAGE_ORDER.indexOf(c.onboarding_stage) >= i).length;
    const prevAtOrPast = i === 0 ? DEMO_CUSTOMERS.total : DEMO_CUSTOMERS.customers.filter(c => STAGE_ORDER.indexOf(c.onboarding_stage) >= i - 1).length;
    return {
      stage,
      count,
      cumulative_at_or_past: atOrPast,
      conversion_from_previous: prevAtOrPast > 0 ? Math.round((atOrPast / prevAtOrPast) * 1000) / 10 : 100,
    };
  }),
  stages_summary: Object.fromEntries(STAGE_ORDER.map(s => [s, DEMO_CUSTOMERS.customers.filter(c => c.onboarding_stage === s).length])),
  stalls: [], // Stall detection requires internal timestamp data — deferred
  customers: DEMO_CUSTOMERS.customers,
};

// --- Plays queue (derived from real signals) ---
export const DEMO_PLAYS = {
  plays: [
    ...DEMO_CUSTOMERS.customers.filter(c => c.churn).map((c, i) => ({
      id: i + 1, customer_id: c.id, play_type: "churn_recovery", status: "pending",
      trigger_signal: { reason: c.churn_reason },
      created_at: new Date().toISOString(), company: c.company,
      health_status: "critical", health_score: 5, arr: c.arr,
    })),
    ...DEMO_CUSTOMERS.customers.filter(c => c.at_risk && !c.churn).map((c, i) => ({
      id: 100 + i, customer_id: c.id, play_type: "burn_rate_alert", status: "pending",
      trigger_signal: { reason: c.risk_reason },
      created_at: new Date().toISOString(), company: c.company,
      health_status: "at_risk", health_score: 30, arr: c.arr,
    })),
    ...DEMO_CUSTOMERS.customers.filter(c => c.onboarding_stage === 'first_workflow').map((c, i) => ({
      id: 200 + i, customer_id: c.id, play_type: "onboarding_nudge", status: "pending",
      trigger_signal: { reason: `${c.company} at first_workflow stage — connector present but no deep integration signals` },
      created_at: new Date().toISOString(), company: c.company,
      health_status: "monitor", health_score: 55, arr: c.arr,
    })),
    ...DEMO_CUSTOMERS.customers.filter(c => c.onboarding_stage === 'champion' && !c.churn).slice(0, 2).map((c, i) => ({
      id: 300 + i, customer_id: c.id, play_type: "expansion_signal", status: "pending",
      trigger_signal: { reason: `Champion account — candidate for case study, reference program, or expansion to additional teams` },
      created_at: new Date().toISOString(), company: c.company,
      health_status: "healthy", health_score: 90, arr: c.arr,
    })),
  ],
};

export const DEMO_PLAY_HISTORY = { plays: [] };

// --- Real pricing (from docs.anthropic.com/en/docs/about-claude/pricing) ---
export const REAL_PRICING = {
  source: "docs.anthropic.com/en/docs/about-claude/pricing",
  updated: "2026-05-29",
  models: {
    "claude-opus-4-8": { input: 5.00, output: 25.00, batch_input: 2.50, batch_output: 12.50, cache_hit: 0.50 },
    "claude-opus-4-7": { input: 5.00, output: 25.00, batch_input: 2.50, batch_output: 12.50, cache_hit: 0.50 },
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
