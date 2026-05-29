import {
  DEMO_CUSTOMERS, DEMO_PORTFOLIO, DEMO_TOKEN_HEALTH,
  DEMO_INCIDENTS, DEMO_ONBOARDING_FUNNEL,
  DEMO_PLAYS, DEMO_PLAY_HISTORY,
} from './demo-data';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let apiOnline = null;

async function checkApi() {
  if (apiOnline !== null) return apiOnline;
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    apiOnline = res.ok;
  } catch {
    apiOnline = false;
  }
  return apiOnline;
}

async function fetchJSON(path, fallback) {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}${path}`);
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  if (fallback !== undefined) return fallback;
  throw new Error('API unavailable and no demo data for this endpoint');
}

async function postJSON(path, body = {}, fallback) {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  if (fallback !== undefined) return fallback;
  throw new Error('API unavailable — connect a backend for live actions');
}

async function putJSON(path, body = {}, fallback) {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  if (fallback !== undefined) return fallback;
  throw new Error('API unavailable — connect a backend for live actions');
}

// ── Customers ──
export const getCustomers = (segment) => {
  const fallback = segment
    ? { customers: DEMO_CUSTOMERS.customers.filter(c => c.segment === segment), total: 0 }
    : DEMO_CUSTOMERS;
  return fetchJSON(`/api/customers${segment ? `?segment=${segment}` : ''}`, fallback);
};

export const getCustomer = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  if (!c) return fetchJSON(`/api/customers/${id}`, undefined);
  return fetchJSON(`/api/customers/${id}`, {
    ...c,
    email: null,
    usage_by_model: c.model_mix ? [
      { model: "opus", input_tokens: 0, output_tokens: 0, cost: Math.round((c.spend_30d || 0) * (c.model_mix.opus_pct / 100)), events: 0 },
      { model: "sonnet", input_tokens: 0, output_tokens: 0, cost: Math.round((c.spend_30d || 0) * (c.model_mix.sonnet_pct / 100)), events: 0 },
      { model: "haiku", input_tokens: 0, output_tokens: 0, cost: Math.round((c.spend_30d || 0) * (c.model_mix.haiku_pct / 100)), events: 0 },
    ] : [],
    usage_by_endpoint: (c.known_products || []).map(p => ({ endpoint: p, cost: 0, events: 0 })),
    daily_spend: [],
  });
};

// ── Token Health ──
export const getTokenHealthSummary = () => fetchJSON('/api/token-health/', DEMO_TOKEN_HEALTH);

export const getTokenHealth = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  if (!c) return fetchJSON(`/api/token-health/${id}`, {});
  return fetchJSON(`/api/token-health/${id}`, {
    customer_id: c.id,
    company: c.company,
    segment: c.segment,
    plan_tier: c.plan_tier,
    score: c.health_score,
    status: c.health_status,
    signals: {
      total_spend: c.spend_30d || 0,
      daily_spend: Math.round((c.spend_30d || 0) / 30),
      projected_monthly_spend: c.spend_30d || 0,
      monthly_commitment: c.monthly_commitment || 0,
      burn_rate_pct: c.monthly_commitment > 0 ? Math.round((c.spend_30d / c.monthly_commitment) * 100 * 10) / 10 : null,
      model_mix: c.model_mix,
      percentile: c.percentile_label || 'Unknown',
    },
    recommendations: [
      `${c.company} is in the ${c.percentile_label || 'unknown'} percentile of Anthropic's 300K customer base.`,
      c.model_mix?.opus_pct > 40 ? `${c.model_mix.opus_pct}% Opus usage detected. For routine tasks, switching to Sonnet or Haiku could reduce costs 60-80%.` : null,
      `Review champion benchmarks — top performers like Notion achieve 90% cost reduction via prompt caching.`,
    ].filter(Boolean),
    analysis: `Analysis derived from public signals. ${c.evidence || ''} Connect an ANTHROPIC_API_KEY for Claude-generated deep analysis.`,
    analysis_source: "demo_inference",
  });
};

export const getTokenHealthHistory = (id) => fetchJSON(`/api/token-health/${id}/history`, { history: [] });
export const getTokenRecommendations = (id) => getTokenHealth(id);
export const runTokenHealthScan = (segment) => postJSON('/api/token-health/scan', segment ? { segment } : {}, DEMO_TOKEN_HEALTH);

// ── Incidents ──
export const getIncidents = () => fetchJSON('/api/incidents/', DEMO_INCIDENTS);
export const getActiveIncidents = () => fetchJSON('/api/incidents/active', { incidents: [] });

// Build incident detail with computed impact from customer model mix
function buildIncidentDetail(incidentId) {
  const incident = DEMO_INCIDENTS.incidents.find(i => i.id === incidentId) || DEMO_INCIDENTS.incidents[0];
  const tiers = { critical_impact: [], high_impact: [], moderate_impact: [], low_impact: [], not_impacted: [] };

  DEMO_CUSTOMERS.customers.forEach(c => {
    const exposure = c.incident_exposure || {};
    let overlap = 0;
    (incident.affected_models || []).forEach(m => {
      if (m === 'opus' && exposure.opus_incidents) overlap += c.model_mix?.opus_pct || 0;
      if (m === 'sonnet' && exposure.sonnet_incidents) overlap += c.model_mix?.sonnet_pct || 0;
      if (m === 'haiku' && exposure.haiku_incidents) overlap += c.model_mix?.haiku_pct || 0;
    });
    (incident.affected_services || []).forEach(s => {
      if (s === 'claude_code' && exposure.claude_code_incidents) overlap += 15;
      if (s === 'api') overlap += 10;
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
  Object.values(tiers).forEach(t => t.sort((a, b) => b.arr - a.arr));
  const impacted = DEMO_CUSTOMERS.total - tiers.not_impacted.length;

  return {
    incident,
    impact: { total_customers: DEMO_CUSTOMERS.total, impacted_customers: impacted, tiers },
  };
}

export const getIncident = (id) => fetchJSON(`/api/incidents/${id}`, buildIncidentDetail(id));
export const createIncident = (data) => postJSON('/api/incidents/', data);
export const resolveIncident = (id) => putJSON(`/api/incidents/${id}/resolve`);
export const assessIncident = (id) => postJSON(`/api/incidents/${id}/assess`, {}, buildIncidentDetail(id));

export const generateIncidentComms = (id) => {
  const detail = buildIncidentDetail(id);
  const topCritical = detail.impact.tiers.critical_impact.slice(0, 3);
  const topHigh = detail.impact.tiers.high_impact.slice(0, 2);
  const topMod = detail.impact.tiers.moderate_impact.slice(0, 1);

  const comms = [];
  topCritical.forEach(c => comms.push({
    tier: "critical_impact", customer_name: c.company,
    subject: `Action Required: ${detail.incident.title} — Impact on ${c.company}`,
    body: `Hi ${c.company} Team,\n\nOur monitoring identified that ${c.company} was directly impacted by the ${detail.incident.title.toLowerCase()} on ${detail.incident.started_at?.split('T')[0]}.\n\nWith ${c.seats?.toLocaleString() || 'your'} active seats, your team experienced approximately ${((new Date(detail.incident.resolved_at) - new Date(detail.incident.started_at)) / 3600000).toFixed(1)} hours of degraded performance. Impact score: ${c.impact_score}/100.\n\nThe issue has been resolved. We're preparing a detailed impact report for your account.\n\nWould you have 30 minutes this week to walk through the specifics?\n\nBest,\nScaled CS Team`,
  }));
  topHigh.forEach(c => comms.push({
    tier: "high_impact", customer_name: c.company,
    subject: `Update: ${detail.incident.title} — ${c.company} Account Impact`,
    body: `Hi ${c.company} Team,\n\nFollowing up on the ${detail.incident.title.toLowerCase()} (${detail.incident.started_at?.split('T')[0]}).\n\n${c.company}'s Claude integration was impacted during this window (impact score: ${c.impact_score}/100). The issue has been fully resolved.\n\nIf you'd like a detailed breakdown of your specific account impact, please don't hesitate to reach out.\n\nBest,\nScaled CS Team`,
  }));
  topMod.forEach(c => comms.push({
    tier: "moderate_impact", customer_name: c.company,
    subject: `FYI: Recent Claude Service Incident — Minimal Impact to ${c.company}`,
    body: `Hi ${c.company} Team,\n\nA brief update: we identified and resolved ${detail.incident.title.toLowerCase()} on ${detail.incident.started_at?.split('T')[0]}. Based on your usage patterns, your account experienced minimal impact (score: ${c.impact_score}/100).\n\nNo action is needed. Full details at status.claude.com.\n\nBest,\nScaled CS Team`,
  }));

  return postJSON(`/api/incidents/${id}/comms`, {}, { communications: comms });
};

export const getIncidentComms = (id) => fetchJSON(`/api/incidents/${id}/comms`, { communications: [] });

// ── Onboarding ──
export const getOnboardingFunnel = () => fetchJSON('/api/onboarding/funnel', DEMO_ONBOARDING_FUNNEL);

export const getOnboardingStatus = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  return fetchJSON(`/api/onboarding/${id}`, c ? {
    customer_id: c.id, company: c.company, stage: c.onboarding_stage,
    evidence: c.evidence, known_products: c.known_products,
  } : {});
};

export const getOnboardingNextSteps = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  const stage = c?.onboarding_stage || 'signed_up';
  const products = c?.known_products || [];
  const usesCode = products.some(p => p.toLowerCase().includes('code'));
  const usesMCP = products.some(p => p.toLowerCase().includes('mcp') || p.toLowerCase().includes('connector'));

  const steps = [];
  if (!usesCode) steps.push("Claude Code adoption: Top performers like Satispay produce 75% of code via Claude. Install Claude Code on every developer machine — IT-managed, not opt-in.");
  if (!usesMCP) steps.push("MCP connector integration: Smartsheet saw 1.74M actions in week 1 of their MCP connector. Connect your existing tools to Claude for immediate workflow value.");
  steps.push("Prompt caching: Notion achieved 90% cost reduction via caching. Implement on all repeated system prompts.");
  if (stage !== 'champion') steps.push("Skill library: Brainlabs authored 400 reusable skills in 4 weeks across 1,000 employees. Start with the '3x rule' — if you do a task 3+ times, make it a Skill.");

  return fetchJSON(`/api/onboarding/${id}/next-steps`, {
    stage, company: c?.company,
    next_steps: steps,
    analysis: `${c?.company || 'This account'} is at the ${stage} stage. ${c?.evidence || ''} Next steps derived from champion benchmark patterns.`,
  });
};

export const getOnboardingJourney = (id) => fetchJSON(`/api/onboarding/${id}/journey`, { events: [] });
export const runOnboardingScan = () => postJSON('/api/onboarding/scan', {}, { scanned: DEMO_CUSTOMERS.total, changes: 0, stalls_detected: 0, plays_created: 0 });

// ── Telemetry & Plays ──
export const getPortfolio = () => fetchJSON('/api/telemetry/portfolio', DEMO_PORTFOLIO);

export const getPortfolioReport = () => {
  const p = DEMO_PORTFOLIO;
  const churn = DEMO_CUSTOMERS.customers.filter(c => c.churn);
  const atRisk = DEMO_CUSTOMERS.customers.filter(c => c.at_risk && !c.churn);
  const champions = DEMO_CUSTOMERS.customers.filter(c => c.onboarding_stage === 'champion' && !c.churn).slice(0, 3);

  const narrative = `WEEKLY PORTFOLIO REPORT — Scaled CS Platform\n\n` +
    `EXECUTIVE SUMMARY\n` +
    `Portfolio: ${p.total_customers} accounts, $${(p.total_arr / 1000000000).toFixed(1)}B estimated ARR across 7 verticals. ` +
    `${p.health_breakdown?.healthy || 0} healthy, ${p.health_breakdown?.at_risk || 0} at-risk, ${p.health_breakdown?.critical || 0} critical. ` +
    `Revenue at risk: $${((p.revenue_at_risk || 0) / 1000000).toFixed(1)}M.\n\n` +
    `KEY RISKS\n` +
    churn.map(c => `• ${c.company} — CHURNED. ${c.churn_reason}`).join('\n') + '\n' +
    atRisk.map(c => `• ${c.company} — AT RISK. ${c.risk_reason}`).join('\n') + '\n\n' +
    `KEY WINS\n` +
    champions.map(c => `• ${c.company} — Champion. ${c.evidence?.substring(0, 100)}...`).join('\n') + '\n\n' +
    `BELL CURVE INSIGHT\n` +
    `These ${p.total_customers} accounts represent the top ~0.02% of Anthropic's 300K business customers. ` +
    `They appear in case studies because they're top performers. The CS Programs Manager's job is to move the other 299,938 accounts toward these benchmark behaviors.\n\n` +
    `FOCUS AREAS THIS WEEK\n` +
    `1. Execute ${DEMO_PLAYS.plays.length} pending plays (${DEMO_PLAYS.plays.map(p => p.play_type).filter((v,i,a) => a.indexOf(v) === i).join(', ')})\n` +
    `2. Address churn: ${churn.map(c => c.company).join(', ')}\n` +
    `3. Expand champions: ${champions.map(c => c.company).join(', ')} are reference program candidates\n\n` +
    `Sources: status.claude.com, github.com/anthropics/claude-code, public filings, case studies\n` +
    `Generated by Scaled CS Platform`;

  return fetchJSON('/api/telemetry/portfolio/report', { narrative });
};

export const getCustomerSignals = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  return fetchJSON(`/api/telemetry/${id}/signals`, c ? {
    company: c.company, health_score: c.health_score, health_status: c.health_status,
    percentile: c.percentile_label, evidence: c.evidence,
  } : {});
};

export const getPlayQueue = () => fetchJSON('/api/telemetry/plays', DEMO_PLAYS);
export const getPlayHistory = () => fetchJSON('/api/telemetry/plays/history', DEMO_PLAY_HISTORY);
export const executePlay = (id) => postJSON(`/api/telemetry/plays/${id}/execute`, {}, { status: "completed", message: "Connect a backend API to execute plays with Claude-generated communications" });
export const skipPlay = (id, reason) => postJSON(`/api/telemetry/plays/${id}/skip`, { reason }, { status: "skipped" });
export const detectPlays = () => postJSON('/api/telemetry/detect', {}, DEMO_PLAYS);
