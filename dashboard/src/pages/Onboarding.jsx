import { useState, useEffect } from 'react';
import { getOnboardingFunnel, getOnboardingStatus, getOnboardingNextSteps, runOnboardingScan } from '../api';

const STAGES = [
  'signed_up', 'api_key_created', 'first_api_call',
  'first_workflow', 'integrated', 'scaling', 'champion'
];

const STAGE_LABELS = {
  signed_up: 'Signed Up',
  api_key_created: 'API Key Created',
  first_api_call: 'First API Call',
  first_workflow: 'First Workflow',
  integrated: 'Integrated',
  scaling: 'Scaling',
  champion: 'Champion',
};

export default function Onboarding() {
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [nextSteps, setNextSteps] = useState(null);
  const [stepsLoading, setStepsLoading] = useState(false);

  useEffect(() => {
    getOnboardingFunnel().then(setFunnel).catch(console.error).finally(() => setLoading(false));
  }, []);

  const scan = () => {
    setScanning(true);
    runOnboardingScan().then((res) => {
      // Refresh funnel after scan
      getOnboardingFunnel().then(setFunnel).catch(console.error);
      setScanning(false);
    }).catch(() => setScanning(false));
  };

  const viewNextSteps = (customerId) => {
    setSelectedCustomer(customerId);
    setStepsLoading(true);
    setNextSteps(null);
    getOnboardingNextSteps(customerId).then(setNextSteps).catch(console.error).finally(() => setStepsLoading(false));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading onboarding data...</div>;

  const stageData = funnel?.stages_summary || funnel?.stages || {};
  const maxCount = Math.max(...Object.values(stageData).map(v => typeof v === 'number' ? v : v?.count || 0), 1);
  const customers = funnel?.customers || [];

  return (
    <div>
      <div className="page-header">
        <h1>Onboarding Autopilot</h1>
        <p>Lifecycle state machine — activate self-serve customers at scale</p>
      </div>

      <div className="section-header">
        <h2>Onboarding Funnel</h2>
        <button className="btn btn-primary" onClick={scan} disabled={scanning}>
          {scanning ? 'Scanning...' : 'Run Onboarding Scan'}
        </button>
      </div>

      <div className="card mb-4" style={{ padding: '24px' }}>
        {STAGES.map((stage) => {
          const count = typeof stageData[stage] === 'number' ? stageData[stage] : stageData[stage]?.count || 0;
          const pct = (count / maxCount) * 100;
          return (
            <div className="funnel-bar" key={stage}>
              <div className="funnel-label">{STAGE_LABELS[stage]}</div>
              <div className="funnel-track">
                <div className="funnel-fill" style={{ width: `${Math.max(pct, 3)}%` }}>
                  {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {funnel?.stalls && funnel.stalls.length > 0 && (
        <>
          <div className="section-header">
            <h2>Stalled Customers</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Days at Stage</th>
                  <th>Plan</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {funnel.stalls.map((s) => (
                  <tr key={s.id || s.customer_id}>
                    <td>{s.company}</td>
                    <td>{STAGE_LABELS[s.stage] || s.stage}</td>
                    <td className="text-orange">{s.days_at_stage}</td>
                    <td>{(s.plan_tier || '').replace(/_/g, ' ')}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => viewNextSteps(s.id || s.customer_id)}>
                        Next Steps
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {customers.length > 0 && (
        <>
          <div className="section-header">
            <h2>All Customers</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Segment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.company}</td>
                    
                    <td>{STAGE_LABELS[c.onboarding_stage] || c.onboarding_stage}</td>
                    <td>{(c.segment || '').replace(/_/g, ' ')}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => viewNextSteps(c.id)}>
                        Next Steps
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedCustomer && (
        <div className="detail-panel mt-4">
          <h3>Next Steps</h3>
          {stepsLoading ? (
            <div className="loading"><div className="spinner" />Generating with Claude...</div>
          ) : nextSteps ? (
            <div>
              {nextSteps.stage && (
                <div className="detail-row">
                  <span className="detail-label">Current Stage</span>
                  <span>{STAGE_LABELS[nextSteps.stage] || nextSteps.stage}</span>
                </div>
              )}
              {nextSteps.next_steps && (
                <div className="mt-4">
                  {(Array.isArray(nextSteps.next_steps) ? nextSteps.next_steps : [nextSteps.next_steps]).map((step, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px' }}>
                      {typeof step === 'string' ? step : step.recommendation || step.action || JSON.stringify(step)}
                    </div>
                  ))}
                </div>
              )}
              {nextSteps.analysis && (
                <div className="report-narrative mt-4">{nextSteps.analysis}</div>
              )}
              {nextSteps.draft_email && (
                <div className="comm-preview mt-4">
                  <h4>Draft Nudge Email</h4>
                  <div className="body">{nextSteps.draft_email}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}
