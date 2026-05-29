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
  { tier: "critical_impact", customer_name: "PwC", subject: "Action Required: Multi-Model Error Rates — Impact on Your Claude Deployment", body: "Hi PwC Partner Team,\n\nI'm reaching out because our monitoring identified that PwC's deployment was directly impacted by the elevated error rates across Opus 4.7, Sonnet 4.6, and Haiku 4.5 on May 22nd.\n\nWith 30,000 active seats across your global practice, your team experienced approximately 4.5 hours of degraded API performance. Based on your usage patterns, Opus 4.7 accounts for the majority of your workloads, which was the most affected model.\n\nWhat happened: Multiple models experienced elevated error rates simultaneously, beginning at 04:16 UTC.\n\nWhat we did: Full resolution was achieved by 08:50 UTC. Root cause analysis is underway.\n\nWhat you should do:\n- Review any batch jobs submitted between 04:00-09:00 UTC May 22 for completion\n- If your teams experienced failed requests, they can be safely retried\n- We're providing a detailed impact report for your account within 48 hours\n\nI'd like to schedule a call with your AI Practice leadership to walk through the impact and our reliability improvements. Would Thursday work?\n\nBest,\nScaled CS Team" },
  { tier: "high_impact", customer_name: "HubSpot", subject: "Update: May 22 Multi-Model Incident — Your Account Impact", body: "Hi HubSpot Product Team,\n\nFollowing up on the multi-model error rate incident on May 22 (04:16-08:50 UTC).\n\nHubSpot's Claude integration was impacted during this window. Your usage spans Sonnet 4.6 and Opus 4.7 — both affected models. We estimate approximately 12% of your API requests during this period received errors.\n\nThe issue has been fully resolved. All models are operating normally. If you'd like a detailed breakdown of your specific account impact, we're happy to provide one.\n\nBest,\nScaled CS Team" },
  { tier: "moderate_impact", customer_name: "Jamf", subject: "FYI: Recent Claude Service Incident — Minimal Impact to Your Account", body: "Hi Jamf Team,\n\nA brief update: on May 22, we identified and resolved elevated error rates affecting multiple Claude models (4h 34m total duration). Based on your usage patterns, your account experienced minimal impact.\n\nNo action is needed on your end. Full details are available at status.claude.com.\n\nBest,\nScaled CS Team" },
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
    `EXECUTIVE SUMMARY\nThe portfolio of 16 accounts ($42.9M ARR) shows mixed health signals this week. ` +
    `7 accounts are healthy, 4 need monitoring, 3 are at risk, and 1 is critical. Revenue at risk: $1.18M (2.7% of portfolio ARR). ` +
    `The Industries segment is the primary concern — all 4 accounts score below 65.\n\n` +
    `KEY RISKS\n` +
    `• YMCA South Australia (critical, score: 12) — Zero meaningful usage 28 days post-signup. Small business team account at immediate churn risk. Trigger reactivation with SMB-specific onboarding content (reference the 15 agentic workflows launched May 13).\n` +
    `• Syracuse University (at-risk, score: 35) — Higher Ed enterprise account ($300K ARR) stalled at first_workflow for 19 days. Academic procurement cycles may be slowing adoption. Offer a dedicated Higher Ed onboarding cohort.\n` +
    `• Smartsheet (at-risk, score: 38) — Enterprise ($270K ARR) stalled at first_workflow for 22 days. Their product integration likely needs technical enablement support.\n` +
    `• Jamf (at-risk, score: 42) — Enterprise ($360K ARR) integrated but health declining. Usage patterns suggest they hit a capability ceiling — recommend expansion use case workshop.\n\n` +
    `KEY WINS\n` +
    `• Notion — Champion status, score 94. $2.1M ARR, fully activated across 350 seats. Building "a workspace for teams and agents." Prime candidate for reference program and case study.\n` +
    `• Accenture — Champion status, score 88. $18M ARR, 30,000 professionals trained. The Claude Partner Network anchor. Expansion into additional practice areas is the play.\n` +
    `• OpusClip — Champion in self-serve, score 87. Scaling API usage efficiently. Proof that the self-serve → champion path works without CSM touch.\n\n` +
    `INCIDENT IMPACT\n` +
    `May 22 multi-model outage (4h 34m) impacted 14 of 16 accounts. PwC and Accenture were in the critical tier due to their scale. ` +
    `Opus 4.7 continues to show the highest incident frequency (12 incidents in 18 days) — likely correlated with it being the highest-traffic model. ` +
    `Recommend proactive reliability comms to strategic accounts before the next occurrence.\n\n` +
    `COMMUNITY INTELLIGENCE\n` +
    `GitHub signal analysis shows quota/cost issues dominate community complaints (1,472 comments on #16157 alone). ` +
    `Issue #38335 (740 comments) about Max plan quota drain aligns with our token health module findings. ` +
    `Recommend a "Token Economics 101" webinar series targeting monitor-tier accounts — addresses the #1 community pain point proactively.\n\n` +
    `FOCUS AREAS THIS WEEK\n` +
    `1. Execute the 5 pending plays (1 token optimization for Slack, 1 reactivation for YMCA SA, 2 onboarding nudges for Smartsheet/Syracuse, 1 expansion signal for Notion)\n` +
    `2. Industries segment (avg score: 44.3) is the weakest — Jamf, Smartsheet, Pendo, and Syracuse all need attention. Consider an industry-specific onboarding cohort.\n` +
    `3. Prepare proactive reliability communication template for the next Opus 4.7 incident — pattern suggests it's a matter of when, not if.\n\n` +
    `Sources: status.claude.com, github.com/anthropics/claude-code, internal telemetry (simulated)\n` +
    `Generated by Claude | Scaled CS Platform`,
});
export const getCustomerSignals = (id) => fetchJSON(`/api/telemetry/${id}/signals`, {});
export const getPlayQueue = () => fetchJSON('/api/telemetry/plays', DEMO_PLAYS);
export const getPlayHistory = () => fetchJSON('/api/telemetry/plays/history', DEMO_PLAY_HISTORY);
export const executePlay = (id) => postJSON(`/api/telemetry/plays/${id}/execute`, {}, { status: "completed", message: "Connect a backend API to execute plays with Claude-generated communications" });
export const skipPlay = (id, reason) => postJSON(`/api/telemetry/plays/${id}/skip`, { reason }, { status: "skipped" });
export const detectPlays = () => postJSON('/api/telemetry/detect', {}, DEMO_PLAYS);
