import { useState, useEffect } from 'react';
import { getIncidents, getIncident, generateIncidentComms } from '../api';
import { DEMO_CUSTOMERS } from '../demo-data';

function CommsViewer({ comms, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = comms[selectedIdx];

  const downloadAll = () => {
    comms.forEach((comm, i) => {
      const text = `To: ${comm.customer_name}\nSubject: ${comm.subject}\nTier: ${(comm.tier || '').replace(/_/g, ' ')}\n\n${comm.body}`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comm_${(comm.customer_name || 'customer').replace(/\s+/g, '_').toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 1100 }}>
      <div className="modal-panel" style={{ maxWidth: '650px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Communications ({comms.length})</h3>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={downloadAll}>Download All</button>
            <button className="btn btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '100%' }}
          >
            {comms.map((c, i) => (
              <option key={i} value={i}>
                {c.customer_name || `Customer ${i + 1}`} — {(c.tier || '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {current && (
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
              <span className={`badge badge-${current.tier === 'critical_impact' ? 'critical' : current.tier === 'high_impact' ? 'at_risk' : 'monitor'}`}>
                {(current.tier || '').replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{current.customer_name}</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{current.subject}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.7', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
              {current.body}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <button className="btn btn-sm" disabled={selectedIdx === 0} onClick={() => setSelectedIdx(selectedIdx - 1)}>
            Previous
          </button>
          <span className="text-muted" style={{ fontSize: '12px' }}>{selectedIdx + 1} of {comms.length}</span>
          <button className="btn btn-sm" disabled={selectedIdx === comms.length - 1} onClick={() => setSelectedIdx(selectedIdx + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comms, setComms] = useState(null);
  const [loading, setLoading] = useState(true);
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

          <div style={{ marginTop: '12px', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => genComms(selected)} disabled={generatingComms}>
              {generatingComms ? 'Generating...' : 'Generate Comms'}
            </button>
          </div>

          <div className="card-grid mb-4">
            <div className="card">
              <div className="card-label">Total Customers</div>
              <div className="card-value">{impact?.total_customers || DEMO_CUSTOMERS?.total || '—'}</div>
            </div>
            <div className="card">
              <div className="card-label">Impacted</div>
              <div className="card-value text-orange">{impact?.impacted_customers || '—'}</div>
            </div>
          </div>

          {tiers ? Object.entries(tiers).map(([tier, data]) => {
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
          }) : <p className="text-muted">Loading impact assessment...</p>}

        </div>
        </div>
      )}

      {comms && (comms.communications || []).length > 0 && (
        <CommsViewer comms={comms.communications} onClose={() => setComms(null)} />
      )}
    </div>
  );
}
