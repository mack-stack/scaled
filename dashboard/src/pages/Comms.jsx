import { useState } from 'react';

// Real Anthropic public communications — scraped from anthropic.com/news, status.claude.com, engineering blog
// 60-day window: April-May 2026
const COMMS_FEED = [
  { date: "2026-05-28", title: "Claude Opus 4.8 Released", type: "model_release", impact: "all customers", products: ["API", "claude.ai", "Claude Code", "Cowork"], priority: "high", summary: "Fixes comment-verbosity and tool-calling issues from 4.7. 4x less likely to let coding flaws slip. New Dynamic Workflows (research preview) — Claude Code runs hundreds of parallel subagents. Same $5/$25 pricing.", url: "https://www.anthropic.com/claude/opus" },
  { date: "2026-05-14", title: "CRITICAL: June 15 Billing Change — Agent SDK Dual-Bucket Split", type: "pricing_change", impact: "all Claude Code power users, Agent SDK developers", products: ["Claude Code", "API"], priority: "critical", summary: "Effective June 15: agent/programmatic usage (Agent SDK, claude -p, GH Actions, third-party agents) splits into SEPARATE credit pool at full API rates. Interactive use unchanged. Users must claim credits before June 15.", url: "https://codersera.com/blog/anthropic-june-2026-billing-change-claude-code/" },
  { date: "2026-05-14", title: "$200M Partnership with Gates Foundation", type: "partnership", impact: "global health, education, agriculture verticals", products: ["API", "Enterprise"], priority: "medium", summary: "$200M in grants, Claude credits, and technical support over 4 years for global health, education, and agriculture.", url: "https://www.anthropic.com/news/gates-foundation-partnership" },
  { date: "2026-05-14", title: "PwC Expanded Strategic Alliance", type: "partnership", impact: "enterprise customers, professional services", products: ["Enterprise"], priority: "medium", summary: "30K certifications expanding to 364K global workforce. New 'Office of CFO' unit on Claude.", url: "https://www.anthropic.com/news/pwc-expanded-partnership" },
  { date: "2026-05-12", title: "Claude for Legal: 20+ MCP Connectors", type: "product_launch", impact: "legal industry", products: ["claude.ai", "Cowork", "API"], priority: "medium", summary: "Connectors for Westlaw, DocuSign, Everlaw, Harvey, Thomson Reuters. 12 practice-area plugins.", url: "https://www.anthropic.com/news" },
  { date: "2026-05-12", title: "Compliance API: 28 Security Integrations", type: "product_launch", impact: "enterprise IT/security teams", products: ["API", "Enterprise"], priority: "high", summary: "CrowdStrike, Palo Alto, Okta, Wiz, Cloudflare, Datadog, Microsoft Purview + 21 more. Unlocks governance-blocked enterprises.", url: "https://securityboulevard.com/2026/05/anthropic-expands-claude-compliance-api-with-28-enterprise-security-integrations/" },
  { date: "2026-05-07", title: "Rate Limits Doubled + SpaceX Compute Deal", type: "pricing_change", impact: "all Claude Code users", products: ["Claude Code", "API"], priority: "high", summary: "5-hour rate limit doubled for all paid plans. Peak-hour throttling removed. Backed by SpaceX Colossus 1 (300MW, 220K+ GPUs).", url: "https://www.anthropic.com/news/higher-limits-spacex" },
  { date: "2026-05-06", title: "Claude Code: Dreaming, Outcomes, Multi-Agent Orchestration", type: "product_launch", impact: "Claude Code users", products: ["Claude Code"], priority: "high", summary: "Dreaming (between-session memory), Outcomes (rubric-based quality), multi-agent orchestration (parallel specialist subagents).", url: "https://code.claude.com/docs/en/whats-new" },
  { date: "2026-05-05", title: "10 Agent Templates for Financial Services", type: "product_launch", impact: "financial services vertical", products: ["API", "Managed Agents"], priority: "medium", summary: "Production-ready agent templates for banking, asset management, insurance use cases.", url: "https://www.anthropic.com/news/finance-agents" },
  { date: "2026-05-04", title: "$1.5B AI Services Company (Blackstone, Goldman, H&F)", type: "partnership", impact: "mid-market enterprise, PE portfolio companies", products: ["Enterprise"], priority: "high", summary: "Embeds engineers inside companies to integrate Claude into core operations.", url: "https://www.anthropic.com/news/enterprise-ai-services-company" },
  { date: "2026-04-16", title: "Claude Opus 4.7 Released", type: "model_release", impact: "all customers", products: ["API", "claude.ai", "Claude Code"], priority: "high", summary: "Major upgrade in SWE, agentic tasks, self-verification, vision (3.75MP). New xhigh effort level. 1M context.", url: "https://www.anthropic.com/news/claude-opus-4-7" },
  { date: "2026-04-09", title: "Claude Cowork General Availability", type: "product_launch", impact: "all paying subscribers", products: ["Cowork", "Claude Desktop"], priority: "high", summary: "Exits research preview. Six enterprise features: RBAC, Group Spend Limits, Usage Analytics, OpenTelemetry, Zoom MCP, Per-Tool Controls.", url: "https://www.anthropic.com/news" },
  { date: "2026-04-08", title: "Managed Agents Public Beta", type: "product_launch", impact: "API developers building agents", products: ["API", "Managed Agents"], priority: "high", summary: "Cloud-hosted agents at scale. Session state, sandboxed execution. $0.08/hr + token costs.", url: "https://www.anthropic.com/engineering/managed-agents" },
  { date: "2026-04-07", title: "Project Glasswing: 10,000+ Zero-Days Found", type: "product_launch", impact: "security teams (restricted access)", products: ["API"], priority: "medium", summary: "Restricted frontier model. Consortium of 12 orgs including AWS, Apple, Google, Microsoft. $100M in credits committed.", url: "https://www.anthropic.com/glasswing" },
];

const TYPE_STYLES = {
  model_release: { color: '#6366f1', label: 'Model Release' },
  product_launch: { color: '#22c55e', label: 'Product Launch' },
  pricing_change: { color: '#f97316', label: 'Pricing Change' },
  partnership: { color: '#3b82f6', label: 'Partnership' },
  incident: { color: '#ef4444', label: 'Incident' },
  engineering_post: { color: '#8888a0', label: 'Engineering' },
};

const PRIORITY_BADGE = {
  critical: 'badge-critical',
  high: 'badge-at_risk',
  medium: 'badge-monitor',
  low: 'badge-healthy',
};

export default function Comms() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? COMMS_FEED : COMMS_FEED.filter(c => c.type === filter);

  // Find the critical June 15 alert
  const criticalAlert = COMMS_FEED.find(c => c.priority === 'critical');

  return (
    <div>
      <div className="page-header">
        <h1>Comms Intelligence</h1>
        <p>Real-time feed from anthropic.com/news, status.claude.com, and engineering blog — 60-day window</p>
      </div>

      {criticalAlert && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-critical">ACTION REQUIRED</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{criticalAlert.title}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{criticalAlert.summary}</p>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Affects: {criticalAlert.products.join(', ')} — {criticalAlert.impact}
          </div>
          <div style={{ marginTop: '8px' }}>
            <a href={criticalAlert.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
              Read Details
            </a>
          </div>
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <div className="card-label">Events (60 days)</div>
          <div className="card-value">{COMMS_FEED.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Model Releases</div>
          <div className="card-value">{COMMS_FEED.filter(c => c.type === 'model_release').length}</div>
        </div>
        <div className="card">
          <div className="card-label">Product Launches</div>
          <div className="card-value">{COMMS_FEED.filter(c => c.type === 'product_launch').length}</div>
        </div>
        <div className="card">
          <div className="card-label">Pricing Changes</div>
          <div className="card-value text-orange">{COMMS_FEED.filter(c => c.type === 'pricing_change').length}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'model_release', 'product_launch', 'pricing_change', 'partnership'].map(t => (
          <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All' : (TYPE_STYLES[t]?.label || t)}
          </button>
        ))}
      </div>

      {filtered.map((item, i) => (
        <div className="card mb-4" key={i} style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: TYPE_STYLES[item.type]?.color || '#8888a0' }}>
                  {TYPE_STYLES[item.type]?.label || item.type}
                </span>
                <span className={`badge ${PRIORITY_BADGE[item.priority]}`}>{item.priority}</span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h3>
            </div>
            <span className="text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{item.date}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '8px' }}>{item.summary}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {item.products.map(p => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', marginRight: '4px', fontSize: '11px' }}>{p}</span>
              ))}
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Source</a>
          </div>
        </div>
      ))}
    </div>
  );
}
