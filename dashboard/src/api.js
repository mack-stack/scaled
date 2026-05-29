const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function postJSON(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function putJSON(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Customers
export const getCustomers = (segment) =>
  fetchJSON(`/api/customers${segment ? `?segment=${segment}` : ''}`);
export const getCustomer = (id) => fetchJSON(`/api/customers/${id}`);

// Token Health
export const getTokenHealthSummary = () => fetchJSON('/api/token-health/');
export const getTokenHealth = (id) => fetchJSON(`/api/token-health/${id}`);
export const getTokenHealthHistory = (id) => fetchJSON(`/api/token-health/${id}/history`);
export const getTokenRecommendations = (id) => fetchJSON(`/api/token-health/${id}/recommendations`);
export const runTokenHealthScan = (segment) => postJSON('/api/token-health/scan', segment ? { segment } : {});

// Incidents
export const getIncidents = () => fetchJSON('/api/incidents/');
export const getActiveIncidents = () => fetchJSON('/api/incidents/active');
export const getIncident = (id) => fetchJSON(`/api/incidents/${id}`);
export const createIncident = (data) => postJSON('/api/incidents/', data);
export const resolveIncident = (id) => putJSON(`/api/incidents/${id}/resolve`);
export const assessIncident = (id) => postJSON(`/api/incidents/${id}/assess`);
export const generateIncidentComms = (id) => postJSON(`/api/incidents/${id}/comms`);
export const getIncidentComms = (id) => fetchJSON(`/api/incidents/${id}/comms`);

// Onboarding
export const getOnboardingFunnel = () => fetchJSON('/api/onboarding/funnel');
export const getOnboardingStatus = (id) => fetchJSON(`/api/onboarding/${id}`);
export const getOnboardingNextSteps = (id) => fetchJSON(`/api/onboarding/${id}/next-steps`);
export const getOnboardingJourney = (id) => fetchJSON(`/api/onboarding/${id}/journey`);
export const runOnboardingScan = () => postJSON('/api/onboarding/scan');

// Telemetry & Plays
export const getPortfolio = () => fetchJSON('/api/telemetry/portfolio');
export const getPortfolioReport = () => fetchJSON('/api/telemetry/portfolio/report');
export const getCustomerSignals = (id) => fetchJSON(`/api/telemetry/${id}/signals`);
export const getPlayQueue = () => fetchJSON('/api/telemetry/plays');
export const getPlayHistory = () => fetchJSON('/api/telemetry/plays/history');
export const executePlay = (id) => postJSON(`/api/telemetry/plays/${id}/execute`);
export const skipPlay = (id, reason) => postJSON(`/api/telemetry/plays/${id}/skip`, { reason });
export const detectPlays = () => postJSON('/api/telemetry/detect');
