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

// Champion product adoption checklist — what top performers use
const CHAMPION_PRODUCTS = ['Claude Code', 'Cowork', 'MCP', 'Managed Agents', 'Prompt Caching', 'Batch API', 'Agent SDK'];

// Infer stalls: companies below 'scaling' stage that were announced 3+ months ago
function inferStalls(customers) {
  const stalls = [];
  const stageRank = { signed_up: 0, api_key_created: 1, first_api_call: 2, first_workflow: 3, integrated: 4, scaling: 5, champion: 6 };
  customers.forEach(c => {
    if (c.churn) return;
    const rank = stageRank[c.onboarding_stage] || 0;
    // Companies at integrated or below with evidence suggesting they've been around for months
    if (rank <= 4 && c.evidence) {
      // Look for date signals in evidence
      const has2025 = c.evidence.includes('2025');
      const hasEarly2026 = c.evidence.includes('Jan 2026') || c.evidence.includes('Feb 2026') || c.evidence.includes('Mar 2026');
      const monthsOld = has2025 ? 6 : hasEarly2026 ? 3 : 0;
      if (monthsOld >= 3) {
        stalls.push({
          id: c.id, company: c.company, stage: c.onboarding_stage,
          days_at_stage: monthsOld * 30, plan_tier: c.plan_tier,
          reason: `Announced ${has2025 ? '2025' : 'early 2026'} but still at ${c.onboarding_stage} stage`,
        });
      }
    }
  });
  return stalls;
}

export const getOnboardingFunnel = () => {
  const stalls = inferStalls(DEMO_CUSTOMERS.customers);
  const funnel = { ...DEMO_ONBOARDING_FUNNEL, stalls };
  return fetchJSON('/api/onboarding/funnel', funnel);
};

export const getOnboardingStatus = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  return fetchJSON(`/api/onboarding/${id}`, c ? {
    customer_id: c.id, company: c.company, stage: c.onboarding_stage,
    evidence: c.evidence, known_products: c.known_products,
  } : {});
};

export const getOnboardingNextSteps = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  if (!c) return fetchJSON(`/api/onboarding/${id}/next-steps`, {});

  const stage = c.onboarding_stage || 'signed_up';
  const products = (c.known_products || []).map(p => p.toLowerCase());
  const evidence = (c.evidence || '').toLowerCase();

  // What this company uses vs what champions use
  const usesCode = products.some(p => p.includes('code'));
  const usesCowork = products.some(p => p.includes('cowork'));
  const usesMCP = products.some(p => p.includes('mcp') || p.includes('connector'));
  const usesAgents = products.some(p => p.includes('agent'));
  const usesCaching = evidence.includes('cach');
  const usesBatch = products.some(p => p.includes('batch'));

  const steps = [];

  // Stage-specific recommendations
  if (stage === 'first_workflow' || stage === 'integrated') {
    steps.push(`${c.company} is at the ${stage.replace(/_/g, ' ')} stage. The gap to 'scaling' requires expanding beyond the initial use case to multiple teams or workflows. Jamf expanded from one department to all 16 — non-engineering teams drove the broadest adoption.`);
  }

  // Product gap analysis — what they DON'T use that champions DO
  if (!usesCode && c.segment !== 'small_business') {
    steps.push(`Claude Code gap: ${c.company} has no public Claude Code adoption. Satispay achieved 75% of code via Claude by installing it on every engineer's laptop from day one — IT-managed, not opt-in. 90% adoption in 30 days.`);
  }
  if (!usesMCP) {
    steps.push(`MCP/Connector gap: No MCP integration detected for ${c.company}. Smartsheet saw 4,000 users and 1.74M actions in week 1 of their connector going GA. Connect ${c.company}'s existing tools to Claude for workflow integration.`);
  }
  if (!usesCaching) {
    steps.push(`Prompt caching gap: No caching signals for ${c.company}. Notion achieved 90% cost reduction and 85% latency reduction via prompt caching. This is the single highest-ROI optimization for any API user.`);
  }
  if (!usesCowork && c.seats > 50) {
    steps.push(`Cowork gap: With ${c.seats.toLocaleString()} estimated seats, ${c.company} could benefit from Claude Cowork for non-engineering teams. Brainlabs rolled out to 1,000 employees in 4 weeks with 400 skills authored.`);
  }
  if (!usesAgents && stage === 'scaling') {
    steps.push(`Managed Agents gap: ${c.company} is at scaling stage but no agent adoption detected. Notion and Rakuten use Managed Agents for automated task execution. Rakuten compressed feature delivery from 24 days to 5 days.`);
  }

  // If champion, suggest expansion/reference
  if (stage === 'champion') {
    steps.push(`${c.company} is at champion stage — consider for customer reference program, case study expansion, and peer mentoring in onboarding cohorts.`);
    if (!evidence.includes('governance') && c.seats > 100) {
      steps.push(`Governance gap: At ${c.seats.toLocaleString()} seats, ${c.company} should implement a skill governance model. Brainlabs uses designated skill owners + a Claude-powered 'skills auditor' that reviews for duplication and token waste.`);
    }
  }

  // Always add at least one step
  if (steps.length === 0) {
    steps.push(`Review champion benchmarks to identify specific adoption gaps for ${c.company}. Top performers score 45+ across 10 benchmarks.`);
  }

  return fetchJSON(`/api/onboarding/${id}/next-steps`, {
    stage,
    company: c.company,
    next_steps: steps,
    analysis: `${c.company} (${stage.replace(/_/g, ' ')}): ${c.evidence || 'No public evidence available.'}\n\nProducts detected: ${c.known_products?.join(', ') || 'None'}\nProducts missing vs champions: ${CHAMPION_PRODUCTS.filter(p => !products.some(up => up.includes(p.toLowerCase()))).join(', ') || 'None — full coverage'}`,
  });
};

export const getOnboardingJourney = (id) => fetchJSON(`/api/onboarding/${id}/journey`, { events: [] });
export const runOnboardingScan = () => {
  const stalls = inferStalls(DEMO_CUSTOMERS.customers);
  return postJSON('/api/onboarding/scan', {}, { scanned: DEMO_CUSTOMERS.total, changes: 0, stalls_detected: stalls.length, plays_created: stalls.length });
};

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
