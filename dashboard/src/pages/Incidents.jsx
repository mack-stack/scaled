import { useState, useEffect } from 'react';
import { getIncidents, getIncident, assessIncident, generateIncidentComms, getIncidentComms } from '../api';

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comms, setComms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [generatingComms, setGeneratingComms] = useState(false);

  useEffect(() => {
    getIncidents().then((res) => setIncidents(res.incidents || res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const viewIncident = (id) => {
    console.log('viewIncident:', id);
    setSelected(id);
    setDetail(null);
    setComms(null);
    getIncident(id).then((res) => {
      console.log('getIncident result:', res);
      setDetail(res);
    }).catch((err) => console.error('getIncident error:', err));
  };

  const assess = (id) => {
    console.log('assessIncident:', id);
    setAssessing(true);
    assessIncident(id).then((res) => {
      console.log('assessIncident result keys:', Object.keys(res || {}));
      console.log('has impact:', !!res?.impact);
      console.log('tiers:', Object.keys(res?.impact?.tiers || {}));
      // Force new object reference so React re-renders
      setDetail({ ...res, _ts: Date.now() });
    }).catch((err) => console.error('assessIncident error:', err)).finally(() => setAssessing(false));
  };

  const genComms = (id) => {
    console.log('genComms:', id);
    setGeneratingComms(true);
    generateIncidentComms(id).then((res) => {
      console.log('genComms result:', res);
      setComms(res);
    }).catch((err) => console.error('genComms error:', err)).finally(() => setGeneratingComms(false));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading incidents...</div>;

  // Normalize detail — API may return { incident, impact } or flat
  const inc = detail?.incident || detail;
  const impact = detail?.impact;
  const tiers = impact?.tiers;

  return (
    <div>
      <div className="page-header">
        <h1>Incident Response Engine</h1>
        <p>Impact assessment, segmented communications, incident lifecycle</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Severity</th>
              <th>Services</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>
                  <span className={`badge badge-${item.severity === 'critical' ? 'critical' : item.severity === 'high' ? 'at_risk' : 'monitor'}`}>
                    {item.severity}
                  </span>
                </td>
                <td>{(item.affected_services || []).join(', ')}</td>
                <td>{item.is_active ? <span className="badge badge-critical">Active</span> : <span className="badge badge-healthy">Resolved</span>}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => viewIncident(item.id)}>
                    {selected === item.id ? 'Viewing' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && inc && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setDetail(null); setComms(null); } }}>
        <div className="modal-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>{inc.title || 'Incident Detail'}</h3>
            <button className="btn btn-sm" onClick={() => { setSelected(null); setDetail(null); setComms(null); }}>Close</button>
          </div>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
            {inc.description}
          </p>
          {inc.status_page_url && (
            <a href={inc.status_page_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm mb-4" style={{ marginBottom: '12px', display: 'inline-block' }}>
              View on status.claude.com
            </a>
          )}

          <div className="flex gap-2 mb-4" style={{ marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={() => assess(selected)} disabled={assessing}>
              {assessing ? 'Assessing...' : 'Assess Impact'}
            </button>
            <button className="btn btn-primary" onClick={() => genComms(selected)} disabled={generatingComms}>
              {generatingComms ? 'Generating...' : 'Generate Comms'}
            </button>
          </div>

          {impact ? (
            <>
              <div className="card-grid mb-4">
                <div className="card">
                  <div className="card-label">Total Customers</div>
                  <div className="card-value">{impact.total_customers}</div>
                </div>
                <div className="card">
                  <div className="card-label">Impacted</div>
                  <div className="card-value text-orange">{impact.impacted_customers}</div>
                </div>
              </div>

              {tiers && Object.entries(tiers).map(([tier, data]) => {
                const customers = Array.isArray(data) ? data : [];
                if (customers.length === 0) return null;
                return (
                  <div key={tier} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: tier.includes('critical') ? 'var(--red)' : tier.includes('high') ? 'var(--orange)' : tier.includes('moderate') ? 'var(--yellow)' : 'var(--text-muted)', marginBottom: '4px' }}>
                      {tier.replace(/_/g, ' ')} ({customers.length})
                    </div>
                    {customers.map((c, i) => (
                      <div key={i} className="detail-row">
                        <span>{c.company || ''}</span>
                        <span className="text-muted" style={{ display: 'flex', gap: '12px' }}>
                          {c.arr ? <span>${(c.arr / 1000000).toFixed(1)}M</span> : null}
                          {c.impact_score != null ? <span>Score: {c.impact_score}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-muted" style={{ fontSize: '13px' }}>Click "Assess Impact" to compute customer impact from model mix overlap.</p>
          )}

          {comms && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Generated Communications</h4>
              {(comms.communications || []).map((comm, i) => (
                <div className="comm-preview" key={i}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                    <span className={`badge badge-${comm.tier === 'critical_impact' ? 'critical' : comm.tier === 'high_impact' ? 'at_risk' : 'monitor'}`}>
                      {(comm.tier || 'general').replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{comm.customer_name || ''}</span>
                  </div>
                  <h4>{comm.subject}</h4>
                  <div className="body">{comm.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
