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

      <div className="flex gap-2 mb-4">
        <button className="btn btn-primary" onClick={detect} disabled={detecting}>
          {detecting ? 'Detecting...' : 'Detect New Plays'}
        </button>
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
            <div className="play-card" key={play.id}>
              <div className="play-info">
                <div className="play-type" style={{ color: TYPE_COLORS[play.play_type] || '#6366f1' }}>
                  {(play.play_type || '').replace(/_/g, ' ')}
                </div>
                <div className="play-customer">{play.company || play.customer_name || `Customer #${play.customer_id}`}</div>
                {play.trigger_signal && (
                  <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                    {typeof play.trigger_signal === 'string' ? play.trigger_signal : play.trigger_signal.reason || JSON.stringify(play.trigger_signal)}
                  </div>
                )}
              </div>
              <div className="play-actions">
                <button className="btn btn-sm btn-primary" onClick={() => exec(play.id)}>Execute</button>
                <button className="btn btn-sm" onClick={() => skip(play.id)}>Skip</button>
              </div>
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
    </div>
  );
}
