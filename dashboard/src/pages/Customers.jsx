import { useState, useEffect } from 'react';
import { getCustomers, getCustomer } from '../api';

export default function Customers({ selectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState('');

  useEffect(() => {
    getCustomers(segmentFilter || undefined)
      .then(res => setCustomers(res.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [segmentFilter]);

  useEffect(() => {
    if (selectedCustomer) {
      getCustomer(selectedCustomer).then(setDetail).catch(console.error);
    }
  }, [selectedCustomer]);

  if (loading) return <div className="loading"><div className="spinner" />Loading customers...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <p>{customers.length} accounts across all segments</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'digital_native_business', 'strategics', 'industries', 'self_serve', 'small_business'].map(seg => (
          <button
            key={seg}
            className={`btn btn-sm ${segmentFilter === seg ? 'btn-primary' : ''}`}
            onClick={() => { setSegmentFilter(seg); setLoading(true); }}
          >
            {seg ? seg.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Segment</th>
              <th>Plan</th>
              <th>ARR</th>
              <th>30d Spend</th>
              <th>Health</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} onClick={() => onSelectCustomer?.(c.id)} style={{ cursor: 'pointer' }}>
                <td>{c.company}</td>
                <td>{(c.segment || '').replace(/_/g, ' ')}</td>
                <td>{(c.plan_tier || '').replace(/_/g, ' ')}</td>
                <td>${(c.arr || 0).toLocaleString()}</td>
                <td>${(c.spend_30d || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td><span className={`badge badge-${c.health_status}`}>{c.health_status}</span></td>
                <td>{(c.onboarding_stage || '').replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="detail-panel">
          <h3>{detail.company}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div className="detail-row"><span className="detail-label">Evidence</span><span style={{fontSize:'12px'}}>{detail.evidence || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Segment</span><span>{(detail.segment || '').replace(/_/g, ' ')}</span></div>
              <div className="detail-row"><span className="detail-label">Plan</span><span>{(detail.plan_tier || '').replace(/_/g, ' ')}</span></div>
              <div className="detail-row"><span className="detail-label">Seats</span><span>{detail.seats}</span></div>
            </div>
            <div>
              <div className="detail-row"><span className="detail-label">ARR</span><span>${(detail.arr || 0).toLocaleString()}</span></div>
              <div className="detail-row"><span className="detail-label">Monthly Commitment</span><span>{detail.monthly_commitment ? `$${detail.monthly_commitment.toLocaleString()}` : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Health Score</span><span>{detail.health_score}/100</span></div>
              <div className="detail-row"><span className="detail-label">Health Status</span><span className={`badge badge-${detail.health_status}`}>{detail.health_status}</span></div>
              <div className="detail-row"><span className="detail-label">Onboarding Stage</span><span>{(detail.onboarding_stage || '').replace(/_/g, ' ')}</span></div>
            </div>
          </div>

          {detail.usage_by_model && detail.usage_by_model.length > 0 && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Usage by Model (30d)</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Model</th><th>Input Tokens</th><th>Output Tokens</th><th>Cost</th><th>Events</th></tr>
                  </thead>
                  <tbody>
                    {detail.usage_by_model.map((u, i) => (
                      <tr key={i}>
                        <td>{u.model}</td>
                        <td>{(u.input_tokens || 0).toLocaleString()}</td>
                        <td>{(u.output_tokens || 0).toLocaleString()}</td>
                        <td>${(u.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>{u.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detail.usage_by_endpoint && detail.usage_by_endpoint.length > 0 && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Usage by Endpoint (30d)</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Endpoint</th><th>Cost</th><th>Events</th></tr>
                  </thead>
                  <tbody>
                    {detail.usage_by_endpoint.map((u, i) => (
                      <tr key={i}>
                        <td>{u.endpoint}</td>
                        <td>${(u.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>{u.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
