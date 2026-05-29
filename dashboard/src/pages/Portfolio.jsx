import { useState, useEffect } from 'react';
import { getPortfolio, getPortfolioReport } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = { healthy: '#22c55e', monitor: '#eab308', at_risk: '#f97316', critical: '#ef4444' };

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    getPortfolio().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadReport = () => {
    setReportLoading(true);
    getPortfolioReport().then(setReport).catch(console.error).finally(() => setReportLoading(false));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading portfolio...</div>;
  if (!data) return <div className="loading">Failed to load portfolio data</div>;

  const healthData = data.health_breakdown
    ? Object.entries(data.health_breakdown).map(([status, count]) => ({ name: status, value: count }))
    : [];

  const segmentData = data.segment_health
    ? Object.entries(data.segment_health).map(([seg, info]) => ({ name: seg.replace(/_/g, ' '), ...info }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>Portfolio Overview</h1>
        <p>Scaled CS Programs Manager command center</p>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-label">Total Customers</div>
          <div className="card-value">{data.total_customers || '—'}</div>
        </div>
        <div className="card">
          <div className="card-label">Portfolio ARR</div>
          <div className="card-value">${((data.total_arr || 0) / 1000000).toFixed(1)}M</div>
        </div>
        <div className="card">
          <div className="card-label">Revenue at Risk</div>
          <div className="card-value text-orange">${((data.revenue_at_risk || 0) / 1000).toFixed(0)}K</div>
          <div className="card-sub">At-risk + critical customers</div>
        </div>
        <div className="card">
          <div className="card-label">30-Day Spend</div>
          <div className="card-value">${((data.total_spend_30d || 0) / 1000).toFixed(1)}K</div>
        </div>
        <div className="card">
          <div className="card-label">Active Incidents</div>
          <div className="card-value">{data.active_incidents || 0}</div>
        </div>
        <div className="card">
          <div className="card-label">Pending Plays</div>
          <div className="card-value">{data.pending_plays || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {healthData.length > 0 && (
          <div className="card">
            <div className="card-label">Health Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {healthData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {segmentData.length > 0 && (
          <div className="card">
            <div className="card-label">Customers by Segment</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={segmentData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8888a0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8888a0' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.top_accounts_needing_attention && data.top_accounts_needing_attention.length > 0 && (
        <>
          <div className="section-header">
            <h2>Top Accounts Needing Attention</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Segment</th>
                  <th>ARR</th>
                  <th>Health</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {data.top_accounts_needing_attention.map((a) => (
                  <tr key={a.id}>
                    <td>{a.company}</td>
                    
                    <td>{(a.segment || '').replace(/_/g, ' ')}</td>
                    <td>${(a.arr || 0).toLocaleString()}</td>
                    <td><span className={`badge badge-${a.health_status}`}>{a.health_status}</span></td>
                    <td>{a.health_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-header">
        <h2>AI Portfolio Report</h2>
        <button className="btn btn-primary" onClick={loadReport} disabled={reportLoading}>
          {reportLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
      {report && (
        <div className="report-narrative">
          {report.narrative || report.report || JSON.stringify(report, null, 2)}
        </div>
      )}
    </div>
  );
}
