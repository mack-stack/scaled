import { useState, useEffect } from 'react';
import { getTokenHealthSummary, getTokenHealth, runTokenHealthScan } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TokenHealth() {
  const [summary, setSummary] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);

  useEffect(() => {
    getTokenHealthSummary().then(setSummary).catch(console.error).finally(() => setLoading(false));
  }, []);

  const scan = () => {
    setScanning(true);
    runTokenHealthScan().then((res) => {
      setSummary(res);
      // Re-fetch summary to pick up any updated data
      getTokenHealthSummary().then(setSummary).catch(console.error);
    }).catch(() => {}).finally(() => setScanning(false));
  };

  const analyzeCustomer = (id) => {
    setAnalyzing(id);
    getTokenHealth(id).then((res) => {
      console.log('Token health result:', res);
      setDetail(res);
    }).catch((err) => {
      console.error('Token health error:', err);
      // Build fallback inline if API call fails
      const c = summary?.customers?.find(c => c.id === id);
      if (c) {
        setDetail({
          customer_id: c.id,
          company: c.company,
          score: c.health_score,
          status: c.health_status,
          signals: {
            spend_30d: c.spend_30d || 0,
            monthly_commitment: c.monthly_commitment || 0,
            burn_rate: c.burn_rate || null,
            model_mix_opus: c.model_mix?.opus_pct + '%' || 'unknown',
            model_mix_sonnet: c.model_mix?.sonnet_pct + '%' || 'unknown',
            model_mix_haiku: c.model_mix?.haiku_pct + '%' || 'unknown',
            seats: c.seats || 0,
          },
          recommendations: [
            'Connect an ANTHROPIC_API_KEY for Claude-generated deep analysis.',
            c.model_mix?.opus_pct > 40 ? `${c.model_mix.opus_pct}% Opus usage. Consider Sonnet/Haiku for routine tasks to reduce costs 60-80%.` : null,
            'Review champion benchmarks — top performers like Notion achieve 90% cost reduction via prompt caching.',
          ].filter(Boolean),
          analysis: c.evidence || 'Connect backend for full analysis.',
          analysis_source: 'inline_fallback',
        });
      }
    }).finally(() => setAnalyzing(null));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading token health...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Token Health Monitor</h1>
        <p>Usage analysis, burn rate alerts, optimization recommendations</p>
      </div>

      <div className="section-header">
        <h2>Portfolio Health</h2>
      </div>

      {summary && (
        <>
          <div className="card-grid">
            {summary.health_breakdown && Object.entries(summary.health_breakdown).map(([status, count]) => (
              <div className="card" key={status}>
                <div className="card-label">{status.replace(/_/g, ' ')}</div>
                <div className={`card-value ${status === 'critical' ? 'text-red' : status === 'at_risk' ? 'text-orange' : ''}`}>
                  {count}
                </div>
              </div>
            ))}
          </div>

          {summary.customers && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Segment</th>
                    <th>30d Spend</th>
                    <th>Commitment</th>
                    <th>Burn Rate</th>
                    <th>Health</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.customers.map((c) => (
                    <tr key={c.id}>
                      <td>{c.company}</td>
                      <td>{(c.segment || '').replace(/_/g, ' ')}</td>
                      <td>${(c.spend_30d || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td>{c.monthly_commitment ? `$${c.monthly_commitment.toLocaleString()}` : '—'}</td>
                      <td>{c.burn_rate ? `${c.burn_rate}%` : '—'}</td>
                      <td><span className={`badge badge-${c.health_status}`}>{c.health_status}</span></td>
                      <td>
                        <button className="btn btn-sm" onClick={() => analyzeCustomer(c.id)} disabled={analyzing === c.id}>
                          {analyzing === c.id ? '...' : 'Analyze'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
        <div className="modal-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Analysis: {detail.company || detail.customer_name || 'Customer'}</h3>
            <button className="btn btn-sm" onClick={() => setDetail(null)}>Close</button>
          </div>

          <div className="card-grid">
            <div className="card">
              <div className="card-label">Health Score</div>
              <div className="card-value">{detail.score ?? '—'}/100</div>
            </div>
            <div className="card">
              <div className="card-label">Status</div>
              <div className="card-value"><span className={`badge badge-${detail.status}`}>{detail.status}</span></div>
            </div>
          </div>

          {detail.signals && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Signals</h4>
              {Object.entries(detail.signals).filter(([k, v]) => v != null && typeof v !== 'object').map(([k, v]) => (
                <div className="detail-row" key={k}>
                  <span className="detail-label">{k.replace(/_/g, ' ')}</span>
                  <span>{typeof v === 'number' ? (v > 1000 ? '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toLocaleString(undefined, { maximumFractionDigits: 2 })) : String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {detail.recommendations && detail.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Recommendations</h4>
              {detail.recommendations.map((rec, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px' }}>
                  {typeof rec === 'string' ? rec : rec.recommendation || JSON.stringify(rec)}
                </div>
              ))}
            </div>
          )}

          {detail.analysis && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Claude Analysis</h4>
              <div className="report-narrative">{detail.analysis}</div>
            </div>
          )}

          {detail.draft_email && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Draft Customer Email</h4>
              <div className="comm-preview">
                <div className="body">{detail.draft_email}</div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
