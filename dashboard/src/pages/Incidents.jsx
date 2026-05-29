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
    setSelected(id);
    setDetail(null);
    setComms(null);
    getIncident(id).then(setDetail).catch(console.error);
    getIncidentComms(id).then(setComms).catch(console.error);
  };

  const assess = (id) => {
    setAssessing(true);
    assessIncident(id).then((res) => {
      setDetail(res);
      setAssessing(false);
    }).catch(() => setAssessing(false));
  };

  const genComms = (id) => {
    setGeneratingComms(true);
    generateIncidentComms(id).then((res) => {
      setComms(res);
      setGeneratingComms(false);
    }).catch(() => setGeneratingComms(false));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading incidents...</div>;

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
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td>{inc.title}</td>
                <td>
                  <span className={`badge badge-${inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'at_risk' : 'monitor'}`}>
                    {inc.severity}
                  </span>
                </td>
                <td>{(inc.affected_services || []).join(', ')}</td>
                <td>{inc.is_active ? <span className="badge badge-critical">Active</span> : <span className="badge badge-healthy">Resolved</span>}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => viewIncident(inc.id)}>
                    {selected === inc.id ? 'Viewing' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && detail && (
        <div className="detail-panel">
          <h3>{detail.title || detail.incident?.title || 'Incident Detail'}</h3>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            {detail.description || detail.incident?.description}
          </p>

          <div className="flex gap-2 mb-4">
            <button className="btn btn-primary" onClick={() => assess(selected)} disabled={assessing}>
              {assessing ? 'Assessing Impact...' : 'Assess Impact'}
            </button>
            <button className="btn btn-primary" onClick={() => genComms(selected)} disabled={generatingComms}>
              {generatingComms ? 'Generating Comms...' : 'Generate Comms'}
            </button>
          </div>

          {detail.impact_tiers && (
            <div className="mt-4">
              <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Impact Assessment</h4>
              {Object.entries(detail.impact_tiers).map(([tier, customers]) => (
                <div key={tier} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: tier.includes('critical') ? 'var(--red)' : tier.includes('high') ? 'var(--orange)' : 'var(--text-muted)', marginBottom: '4px' }}>
                    {tier.replace(/_/g, ' ')} ({Array.isArray(customers) ? customers.length : 0})
                  </div>
                  {Array.isArray(customers) && customers.map((c, i) => (
                    <div key={i} className="detail-row">
                      <span>{c.company || c.name || c}</span>
                      <span className="text-muted">{c.impact_score ? `Impact: ${c.impact_score}%` : ''}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {comms && (
        <div>
          <div className="section-header">
            <h2>Generated Communications</h2>
          </div>
          {(Array.isArray(comms.communications || comms) ? (comms.communications || comms) : []).map((comm, i) => (
            <div className="comm-preview" key={i}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                <span className={`badge badge-${comm.tier === 'critical_impact' ? 'critical' : comm.tier === 'high_impact' ? 'at_risk' : 'monitor'}`}>
                  {(comm.tier || 'general').replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '13px' }}>{comm.customer_name || comm.company || ''}</span>
              </div>
              <h4>{comm.subject}</h4>
              <div className="body">{comm.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
