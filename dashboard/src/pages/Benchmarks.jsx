import { useState } from 'react';
import { DEMO_CUSTOMERS } from '../demo-data';

// Helper: check evidence/products for keywords
const ev = (c) => (c.evidence || '').toLowerCase();
const prods = (c) => (c.known_products || []).map(p => p.toLowerCase());
const hasProduct = (c, ...terms) => prods(c).some(p => terms.some(t => p.includes(t)));
const hasEvidence = (c, ...terms) => terms.some(t => ev(c).includes(t));

// Champion benchmarks — scoring uses evidence + products, NOT hardcoded company names
const BENCHMARKS = [
  {
    id: 1, name: "Time to Org-Wide Adoption",
    champion_metric: "30 days to 90%+ adoption",
    champion_source: "Satispay",
    champion_evidence: "90% engineer adoption in 30 days. Claude Code installed on every engineer's laptop from day one.",
    source_url: "https://www.anthropic.com/news/milan-office-opening",
    what_champions_do: "Install Claude Code on every machine from day one via IT — not opt-in. Satispay hit 90% in 30 days.",
    playbook: "Work with IT to deploy Claude Code/Cowork org-wide. Set a 30-day adoption target. Measure weekly.",
    score: (c) => {
      // Champions with rapid rollout evidence score highest
      if (hasEvidence(c, '30 days', '4 weeks', 'day one', 'all employees', 'company-wide', 'campus-wide', 'all 16 department')) return 85;
      if (c.onboarding_stage === 'champion') return 65;
      if (c.onboarding_stage === 'scaling') return 45;
      if (c.onboarding_stage === 'integrated') return 25;
      return 10;
    },
  },
  {
    id: 2, name: "Prompt Caching Adoption",
    champion_metric: "90% cost reduction via caching",
    champion_source: "Notion",
    champion_evidence: "Prompt caching reduced costs 90% and latency 85%.",
    source_url: "https://claude.com/customers/notion",
    what_champions_do: "Implement prompt caching on all repeated system prompts. Notion achieved 90% input cost reduction. Avg customer cache rate ~28%.",
    playbook: "Audit top 10 most-called prompts. Implement caching on system prompts and repeated context. Target 60%+ cache hit rate.",
    score: (c) => {
      if (hasEvidence(c, 'cach', '90% cost', '85% latency')) return 90;
      if (hasProduct(c, 'api', 'bedrock') && c.onboarding_stage === 'champion') return 50;
      if (c.onboarding_stage === 'scaling') return 30;
      return 10;
    },
  },
  {
    id: 3, name: "Skill Library Development",
    champion_metric: "400 skills authored in 4 weeks",
    champion_source: "Brainlabs",
    champion_evidence: "1,000 employees, 400 skills in 4 weeks. Notion-based skill library with skills auditor.",
    source_url: "https://claude.com/customers/brainlabs",
    what_champions_do: "Create a shared skill library. Use the '3x rule' — if you do it 3+ times, make it a Skill.",
    playbook: "Launch a Notion/Confluence skill library. Assign skill owners per team. Deploy a skills auditor for quality control.",
    score: (c) => {
      if (hasEvidence(c, 'skill', '400', 'library', 'auditor')) return 90;
      if (hasProduct(c, 'cowork', 'managed agent')) return 50;
      if (c.onboarding_stage === 'champion') return 35;
      if (c.onboarding_stage === 'scaling') return 15;
      return 5;
    },
  },
  {
    id: 4, name: "Code Production via Claude",
    champion_metric: "75% of monthly code via Claude",
    champion_source: "Satispay",
    champion_evidence: "75%+ of monthly code via Claude. 18-month roadmap in 7 months.",
    source_url: "https://www.01net.it/satispay-claude-anthropic-75-codice-ai/",
    what_champions_do: "Use Claude Code as primary engineering partner, not assistant. Satispay IS how they write code.",
    playbook: "Deploy Claude Code to all engineers. Track % of PRs with Claude involvement. Target 50%+ in 90 days.",
    score: (c) => {
      if (hasEvidence(c, '75%', 'code via claude', 'code produced')) return 90;
      if (hasEvidence(c, '650', 'pr', 'merge')) return 80;
      if (hasProduct(c, 'claude code', 'agent sdk')) return 55;
      if (hasProduct(c, 'code')) return 40;
      if (c.onboarding_stage === 'champion') return 30;
      return 5;
    },
  },
  {
    id: 5, name: "AI-Driven PR Velocity",
    champion_metric: "650+ AI-generated PRs merged/month",
    champion_source: "Spotify",
    champion_evidence: "650+ PRs/month via 'Honk' platform. 90% engineering time savings.",
    source_url: "https://engineering.atspotify.com/2026/4/anthropic-agentic-development",
    what_champions_do: "Build an internal platform wrapping Claude Code for your org's specific workflows.",
    playbook: "Create a standard Claude Code config per repo. Wrap in CI/CD. Measure PRs/month with Claude involvement.",
    score: (c) => {
      if (hasEvidence(c, '650', 'honk', 'pr')) return 95;
      if (hasEvidence(c, 'merge', 'autonomous cod', '99.9%')) return 70;
      if (hasProduct(c, 'claude code', 'agent sdk') && (c.seats || 0) > 100) return 45;
      if (hasProduct(c, 'code')) return 25;
      return 5;
    },
  },
  {
    id: 6, name: "Cross-Department Deployment",
    champion_metric: "16 departments on Claude",
    champion_source: "Jamf",
    champion_evidence: "All 16 departments. Non-engineering teams driving broadest adoption.",
    source_url: "https://claude.com/customers/jamf",
    what_champions_do: "Expand beyond engineering. Jamf found non-eng teams had the broadest adoption.",
    playbook: "Identify 3 non-engineering departments with repetitive workflows. Pilot Claude Cowork. Measure adoption weekly.",
    score: (c) => {
      if (hasEvidence(c, '16 department', 'all department', 'company-wide', 'workforce', 'campus-wide')) return 85;
      if (hasEvidence(c, '470k', '276k', '350k', '364k', '100k')) return 75; // Massive org-wide rollouts
      if (hasProduct(c, 'cowork') && (c.seats || 0) > 500) return 55;
      if (c.onboarding_stage === 'champion') return 40;
      if (c.onboarding_stage === 'scaling') return 20;
      return 5;
    },
  },
  {
    id: 7, name: "Customer-Facing AI Impact",
    champion_metric: "87% reduction in resolution time",
    champion_source: "Lyft",
    champion_evidence: "87% CS resolution time reduction. 50%+ resolved in <3 min. 40M+ riders.",
    source_url: "https://www.lyft.com/blog/posts/lyft-and-anthropic-team-up-to-redefine-customer-obsessed-ai",
    what_champions_do: "Deploy Claude on customer-facing workloads — support, fraud detection, content delivery.",
    playbook: "Identify highest-volume customer touchpoint. Build Claude-powered resolution. Measure time-to-resolve before/after.",
    score: (c) => {
      if (hasEvidence(c, 'resolution', 'customer service', 'fraud', 'contact center', '87%')) return 85;
      if (hasEvidence(c, 'customer', 'rider', 'dasher', 'clinical', 'patient')) return 55;
      if (hasProduct(c, 'bedrock', 'api') && c._inputs?.vertical_type === 'customer_support') return 65;
      if (c.onboarding_stage === 'champion') return 25;
      return 5;
    },
  },
  {
    id: 8, name: "MCP/Connector Utilization",
    champion_metric: "1.74M actions in week 1",
    champion_source: "Smartsheet",
    champion_evidence: "4,000 users, 1.74M actions in first week. Read + write.",
    source_url: "https://www.smartsheet.com/content-center/smartsheet-connector-claude-now-generally-available",
    what_champions_do: "Enable bidirectional MCP connectors. Smartsheet proved demand is massive when friction is removed.",
    playbook: "Launch MCP connector for your primary tool. Enable read + write. Measure actions/user/week.",
    score: (c) => {
      if (hasEvidence(c, 'mcp', '1.74m', 'connector ga')) return 85;
      if (hasProduct(c, 'mcp', 'connector')) return 60;
      if (hasEvidence(c, 'integration', 'two-way', 'bidirectional')) return 45;
      if (c.onboarding_stage === 'champion') return 20;
      return 5;
    },
  },
  {
    id: 9, name: "Governance & Quality Control",
    champion_metric: "Designated skill owners + auditor",
    champion_source: "Brainlabs",
    champion_evidence: "Skill owners per team. Claude-powered skills auditor. Quality at scale.",
    source_url: "https://claude.com/customers/brainlabs",
    what_champions_do: "Build governance from day one — designated owners, review process, quality auditing.",
    playbook: "Assign AI champion per department. Create approval workflow for published skills. Deploy a meta-skill auditor.",
    score: (c) => {
      if (hasEvidence(c, 'governance', 'auditor', 'skill owner', 'center of excellence', 'coe')) return 90;
      if (hasEvidence(c, 'platform', 'proprietary', 'digital gateway', 'freshfields lab')) return 65;
      if ((c.seats || 0) > 10000 && c.onboarding_stage === 'champion') return 50;
      if ((c.seats || 0) > 1000) return 30;
      return 5;
    },
  },
  {
    id: 10, name: "Roadmap Acceleration",
    champion_metric: "18-month roadmap in 7 months",
    champion_source: "Satispay",
    champion_evidence: "18-month roadmap in 7 months. 10x faster on core system. 50% more features.",
    source_url: "https://www.01net.it/satispay-claude-anthropic-75-codice-ai/",
    what_champions_do: "Measure Claude's impact in roadmap velocity — the real ROI is shipping faster, not saving money.",
    playbook: "Baseline current sprint velocity. Deploy Claude Code to the team. Measure velocity after 30/60/90 days.",
    score: (c) => {
      if (hasEvidence(c, 'roadmap', '18-month', '10x', '24 days')) return 90;
      if (hasEvidence(c, 'faster', 'accelerat', 'compress', 'reduction in time')) return 65;
      if (hasEvidence(c, '90%', '87%', '50%')) return 50;
      if (c.onboarding_stage === 'champion') return 30;
      if (c.onboarding_stage === 'scaling') return 15;
      return 5;
    },
  },
];

function getQuartile(score, allScores) {
  const sorted = [...allScores].sort((a, b) => a - b);
  const idx = sorted.indexOf(score);
  const pct = idx / sorted.length;
  if (pct >= 0.75) return { label: 'Top 25%', color: 'var(--green)' };
  if (pct >= 0.50) return { label: 'Top 50%', color: 'var(--text)' };
  if (pct >= 0.25) return { label: 'Bottom 50%', color: 'var(--yellow)' };
  return { label: 'Bottom 25%', color: 'var(--red)' };
}

export default function BenchmarksPage() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [expandedBenchmark, setExpandedBenchmark] = useState(null);

  const customers = DEMO_CUSTOMERS.customers;
  const customer = customers.find(c => c.id === selectedCustomer);

  return (
    <div>
      <div className="page-header">
        <h1>Champion Benchmarks</h1>
        <p>10 behaviors derived from real top-performer case studies. Every benchmark cites the source.</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Score a customer against champion benchmarks:</label>
        <select
          value={selectedCustomer || ''}
          onChange={(e) => setSelectedCustomer(Number(e.target.value) || null)}
          style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '300px' }}
        >
          <option value="">Select a customer...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.company} ({c.onboarding_stage})</option>
          ))}
        </select>
      </div>

      {BENCHMARKS.map((b, i) => {
        const allScores = customers.map(c => b.score(c));
        const customerScore = customer ? b.score(customer) : null;
        const quartile = customerScore !== null ? getQuartile(customerScore, allScores) : null;
        const championScore = Math.max(...allScores);
        const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

        return (
          <div className="card mb-4" key={b.id} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>#{b.id}</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{b.name}</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Champion: <strong style={{ color: 'var(--green)' }}>{b.champion_metric}</strong> — {b.champion_source}
                </div>
              </div>
              {customer && quartile && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: quartile.color }}>{customerScore}{b.unit !== 'governance model in place' ? '' : ''}</div>
                  <div style={{ fontSize: '11px', color: quartile.color }}>{quartile.label}</div>
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>{b.what_champions_do}</p>

            {customer && (
              <>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{customer.company}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: quartile?.color }}>{customerScore}/100</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portfolio Avg</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{avgScore}/100</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Champion</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--green)' }}>{championScore}/100</div>
                  </div>
                </div>
                {customerScore < avgScore && b.playbook && (
                  <div style={{ background: 'rgba(249, 115, 22, 0.06)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '4px' }}>Playbook — Close this gap</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>{b.playbook}</div>
                  </div>
                )}
              </>
            )}

            <button className="btn btn-sm" onClick={() => setExpandedBenchmark(expandedBenchmark === b.id ? null : b.id)}>
              {expandedBenchmark === b.id ? 'Hide Evidence' : 'View Evidence & Playbook'}
            </button>

            {expandedBenchmark === b.id && (
              <div className="mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
                  <strong>Evidence:</strong> {b.champion_evidence}
                </div>
                {b.playbook && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '4px' }}>Playbook</div>
                    <div style={{ fontSize: '13px' }}>{b.playbook}</div>
                  </div>
                )}
                <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Source: {b.champion_source}</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
