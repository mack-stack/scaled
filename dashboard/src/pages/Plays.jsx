import { useState, useEffect } from 'react';
import { getPlayQueue, getPlayHistory, executePlay, skipPlay, detectPlays } from '../api';

const TYPE_COLORS = {
  token_optimization: '#3b82f6',
  burn_rate_alert: '#f97316',
  incident_outreach: '#ef4444',
  onboarding_nudge: '#22c55e',
  expansion_signal: '#6366f1',
  churn_risk: '#ef4444',
  reactivation: '#eab308',
  milestone_celebration: '#22c55e',
};

export default function Plays() {
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState(null);

  const refresh = () => {
    Promise.all([
      getPlayQueue().then(res => setQueue(res.plays || res || [])),
      getPlayHistory().then(res => setHistory(res.plays || res || [])),
    ]).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const detect = () => {
    setDetecting(true);
    detectPlays().then(() => {
      refresh();
      setDetecting(false);
    }).catch(() => setDetecting(false));
  };

  const exec = (id) => {
    executePlay(id).then(() => refresh()).catch(console.error);
  };

  const skip = (id) => {
    skipPlay(id, 'Manual skip from dashboard').then(() => refresh()).catch(console.error);
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading plays...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Plays Queue</h1>
        <p>Signal-to-action mapping — automated CS engagement</p>
      </div>


      <div className="tabs">
        <button className={`tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
          Queue ({queue.length})
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          History ({history.length})
        </button>
      </div>

      {tab === 'queue' && (
        queue.length === 0 ? (
          <div className="loading">No pending plays — run detection to find new signals</div>
        ) : (
          queue.map((play) => (
            <div className="play-card" key={play.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="play-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="play-type" style={{ color: TYPE_COLORS[play.play_type] || '#6366f1' }}>
                      {(play.play_type || '').replace(/_/g, ' ')}
                    </div>
                    {play.arr ? <span className="text-muted" style={{ fontSize: '11px' }}>${(play.arr / 1000000).toFixed(1)}M ARR</span> : null}
                  </div>
                  <div className="play-customer">{play.company || play.customer_name || `Customer #${play.customer_id}`}</div>
                  {play.trigger_signal && (
                    <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.5' }}>
                      {typeof play.trigger_signal === 'string' ? play.trigger_signal : play.trigger_signal.reason || JSON.stringify(play.trigger_signal)}
                    </div>
                  )}
                </div>
                <div className="play-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => setSelectedPlay(play)}>View Playbook</button>
                  <button className="btn btn-sm" onClick={() => skip(play.id)}>Skip</button>
                </div>
              </div>
              {play.playbook && (
                <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--accent)' }}>Playbook:</strong> {play.playbook}
                </div>
              )}
            </div>
          ))
        )
      )}

      {tab === 'history' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Executed</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="5" className="text-muted" style={{ textAlign: 'center' }}>No play history yet</td></tr>
              ) : history.map((play) => (
                <tr key={play.id}>
                  <td style={{ color: TYPE_COLORS[play.play_type] || '#6366f1' }}>
                    {(play.play_type || '').replace(/_/g, ' ')}
                  </td>
                  <td>{play.company || play.customer_name || `#${play.customer_id}`}</td>
                  <td>
                    <span className={`badge ${play.status === 'completed' ? 'badge-healthy' : play.status === 'skipped' ? 'badge-monitor' : 'badge-at_risk'}`}>
                      {play.status}
                    </span>
                  </td>
                  <td className="text-muted">{play.created_at ? new Date(play.created_at).toLocaleDateString() : '—'}</td>
                  <td className="text-muted">{play.executed_at ? new Date(play.executed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlay && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlay(null); }}>
          <div className="modal-panel" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{selectedPlay.company}</h3>
              <button className="btn btn-sm" onClick={() => setSelectedPlay(null)}>Close</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span className={`badge badge-${selectedPlay.health_status === 'critical' ? 'critical' : selectedPlay.health_status === 'at_risk' ? 'at_risk' : 'monitor'}`}>
                {(selectedPlay.play_type || '').replace(/_/g, ' ')}
              </span>
              {selectedPlay.arr ? <span className="text-muted" style={{ fontSize: '12px' }}>${(selectedPlay.arr / 1000000).toFixed(1)}M ARR</span> : null}
            </div>

            <div className="detail-panel" style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Trigger Signal</h4>
              <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {typeof selectedPlay.trigger_signal === 'string' ? selectedPlay.trigger_signal : selectedPlay.trigger_signal?.reason || ''}
              </p>
            </div>

            {selectedPlay.playbook && (
              <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '8px' }}>Playbook</h4>
                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{selectedPlay.playbook}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => { exec(selectedPlay.id); setSelectedPlay(null); }}>
                Execute Play
              </button>
              <button className="btn" onClick={() => { skip(selectedPlay.id); setSelectedPlay(null); }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
