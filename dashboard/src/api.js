import {
  DEMO_CUSTOMERS, DEMO_PORTFOLIO, DEMO_TOKEN_HEALTH, DEMO_TOKEN_HEALTH_DETAIL,
  DEMO_INCIDENTS, DEMO_INCIDENT_DETAIL, DEMO_ONBOARDING_FUNNEL,
  DEMO_PLAYS, DEMO_PLAY_HISTORY,
} from './demo-data';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Track whether the API is reachable
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
    } catch { /* fall through to demo */ }
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

// Customers
export const getCustomers = (segment) => {
  const fallback = segment
    ? { customers: DEMO_CUSTOMERS.customers.filter(c => c.segment === segment), total: 0 }
    : DEMO_CUSTOMERS;
  return fetchJSON(`/api/customers${segment ? `?segment=${segment}` : ''}`, fallback);
};
export const getCustomer = (id) => {
  const c = DEMO_CUSTOMERS.customers.find(c => c.id === id);
  return fetchJSON(`/api/customers/${id}`, c ? { ...c, email: `${c.name.split(' ')[0].toLowerCase()}@${c.company.toLowerCase().replace(/ /g, '')}.com`, usage_by_model: [], usage_by_endpoint: [], daily_spend: [] } : undefined);
};

// Token Health
export const getTokenHealthSummary = () => fetchJSON('/api/token-health/', DEMO_TOKEN_HEALTH);
export const getTokenHealth = (id) => fetchJSON(`/api/token-health/${id}`, DEMO_TOKEN_HEALTH_DETAIL);
export const getTokenHealthHistory = (id) => fetchJSON(`/api/token-health/${id}/history`, { history: [] });
export const getTokenRecommendations = (id) => fetchJSON(`/api/token-health/${id}/recommendations`, DEMO_TOKEN_HEALTH_DETAIL);
export const runTokenHealthScan = (segment) => postJSON('/api/token-health/scan', segment ? { segment } : {}, DEMO_TOKEN_HEALTH);

// Incidents
export const getIncidents = () => fetchJSON('/api/incidents/', DEMO_INCIDENTS);
export const getActiveIncidents = () => fetchJSON('/api/incidents/active', { incidents: [] });
export const getIncident = (id) => fetchJSON(`/api/incidents/${id}`, DEMO_INCIDENT_DETAIL);
export const createIncident = (data) => postJSON('/api/incidents/', data);
export const resolveIncident = (id) => putJSON(`/api/incidents/${id}/resolve`);
export const assessIncident = (id) => postJSON(`/api/incidents/${id}/assess`, {}, DEMO_INCIDENT_DETAIL);
export const generateIncidentComms = (id) => postJSON(`/api/incidents/${id}/comms`, {}, { communications: [
  { tier: "critical_impact", customer_name: "StreamScale AI", subject: "Action Required: Context Caching Issue Impact on Your Claude Code Workflows", body: "Hi Sarah,\n\nI'm reaching out because our monitoring identified that StreamScale AI was directly impacted by the context caching issue we disclosed on March 26th.\n\nBased on your usage patterns, approximately 69% of your API spend flows through Claude Code, which was one of the most affected services. You may have experienced degraded context retention in longer coding sessions during this period.\n\nWhat happened: An optimization we deployed cleared reasoning context on every conversation turn instead of once per session. This meant Claude was effectively losing its chain of thought mid-conversation.\n\nWhat we did: The fix was deployed on April 10th. All sessions now correctly preserve context throughout.\n\nWhat you should do:\n- Review any code generated between March 26 - April 10 for quality\n- If you noticed increased error rates during that window, they should now be resolved\n- We've credited your account for the affected period\n\nI'd welcome the opportunity to walk through your specific impact in more detail. Would you have 30 minutes this week?\n\nBest,\nScaled CS Team" },
  { tier: "high_impact", customer_name: "DataPipe Labs", subject: "Update: Context Caching Issue — Your Account Impact", body: "Hi Marcus,\n\nI wanted to follow up regarding the context caching issue that affected Claude API and Claude Code between March 26 - April 10.\n\nDataPipe Labs uses both the Messages API and Claude Code, both of which were impacted. You may have noticed reduced quality in multi-turn conversations during this window.\n\nThe issue has been fully resolved. If you'd like a detailed breakdown of how your specific usage was affected, please don't hesitate to reach out.\n\nBest,\nScaled CS Team" },
  { tier: "moderate_impact", customer_name: "Pacific Coast Mfg", subject: "FYI: Recent Claude Service Issue — Minimal Impact to Your Account", body: "Hi Rachel,\n\nA brief update: between March 26 - April 10, we identified and resolved a context caching issue affecting some Claude API users. Based on your usage patterns, your account experienced minimal impact.\n\nNo action is needed on your end. Full details are available on our status page.\n\nBest,\nScaled CS Team" },
]});
export const getIncidentComms = (id) => fetchJSON(`/api/incidents/${id}/comms`, { communications: [] });

// Onboarding
export const getOnboardingFunnel = () => fetchJSON('/api/onboarding/funnel', DEMO_ONBOARDING_FUNNEL);
export const getOnboardingStatus = (id) => fetchJSON(`/api/onboarding/${id}`, {});
export const getOnboardingNextSteps = (id) => fetchJSON(`/api/onboarding/${id}/next-steps`, {
  stage: DEMO_CUSTOMERS.customers.find(c => c.id === id)?.onboarding_stage || 'signed_up',
  next_steps: [
    "You're currently using only the Messages API. Try the Batch API for your nightly data processing — it's 50% cheaper and handles bulk workloads efficiently.",
    "Your cache hit rate is below 30%. Implement prompt caching for your repeated system prompts to save up to 90% on input tokens.",
    "Consider upgrading from Sonnet to a mix of Haiku (for classification/routing) and Sonnet (for generation) — this model mix typically reduces costs 40% with minimal quality impact.",
  ],
  analysis: "Based on usage patterns, this account has room to optimize both cost and capability. The single-model, single-endpoint usage suggests early-stage integration that hasn't yet explored the full platform.",
});
export const getOnboardingJourney = (id) => fetchJSON(`/api/onboarding/${id}/journey`, { events: [] });
export const runOnboardingScan = () => postJSON('/api/onboarding/scan', {}, { scanned: 16, changes: 0, stalls_detected: 3, plays_created: 2 });

// Telemetry & Plays
export const getPortfolio = () => fetchJSON('/api/telemetry/portfolio', DEMO_PORTFOLIO);
export const getPortfolioReport = () => fetchJSON('/api/telemetry/portfolio/report', {
  narrative: `WEEKLY PORTFOLIO REPORT — Scaled CS Platform\n\n` +
    `EXECUTIVE SUMMARY\nThe portfolio of 16 accounts ($12.6M ARR) shows mixed health signals this week. ` +
    `8 accounts are healthy, 4 need monitoring, 3 are at risk, and 1 is critical. Revenue at risk: $903K (7.2% of portfolio ARR).\n\n` +
    `KEY RISKS\n` +
    `• BuildRight Contractors (critical, score: 10) — Zero usage since signup 22 days ago. $2.4K ARR at immediate churn risk. Recommend reactivation play with SMB onboarding content.\n` +
    `• ContentForge (critical, score: 15) — Stalled at first_api_call for 18 days. This self-serve Pro user likely hit a friction point. Trigger onboarding nudge with API quickstart guide.\n` +
    `• LegalEdge AI (at-risk, score: 38) — Enterprise account ($336K ARR) stuck at first_workflow for 31 days. Compliance review may be blocking adoption. Offer a Center of Excellence consultation.\n\n` +
    `KEY WINS\n` +
    `• StreamScale AI — 103% month-over-month spend growth. Expansion signal detected. This $1M ARR account is accelerating — route to sales for upsell conversation.\n` +
    `• Veridia Health — Champion status, score 94. $1.8M ARR account fully activated. Candidate for customer reference program and case study.\n\n` +
    `FOCUS AREAS THIS WEEK\n` +
    `1. Execute the 5 pending plays (2 onboarding nudges, 1 reactivation, 1 expansion signal, 1 token optimization)\n` +
    `2. Industries segment (avg score: 46.7) is the weakest — Pacific Coast Mfg and LegalEdge both stalled. Consider an industry-specific onboarding cohort.\n` +
    `3. Overall cache hit rates are low (avg 34%). A "Token Economics 101" webinar targeting the monitor-tier accounts could lift scores and prevent at-risk transitions.\n\n` +
    `Generated by Claude | Scaled CS Platform`,
});
export const getCustomerSignals = (id) => fetchJSON(`/api/telemetry/${id}/signals`, {});
export const getPlayQueue = () => fetchJSON('/api/telemetry/plays', DEMO_PLAYS);
export const getPlayHistory = () => fetchJSON('/api/telemetry/plays/history', DEMO_PLAY_HISTORY);
export const executePlay = (id) => postJSON(`/api/telemetry/plays/${id}/execute`, {}, { status: "completed", message: "Connect a backend API to execute plays with Claude-generated communications" });
export const skipPlay = (id, reason) => postJSON(`/api/telemetry/plays/${id}/skip`, { reason }, { status: "skipped" });
export const detectPlays = () => postJSON('/api/telemetry/detect', {}, DEMO_PLAYS);
