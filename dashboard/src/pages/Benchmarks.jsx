import { useState } from 'react';
import { DEMO_CUSTOMERS } from '../demo-data';

// Champion benchmarks derived from real public case studies
// Every benchmark cites the source company and the specific metric
const BENCHMARKS = [
  {
    id: 1,
    name: "Time to Org-Wide Adoption",
    champion_metric: "30 days to 90%+ adoption",
    champion_source: "Satispay",
    champion_evidence: "90% engineer adoption in 30 days. Claude Code installed on every engineer's laptop from day one.",
    source_url: "https://www.anthropic.com/news/milan-office-opening",
    what_champions_do: "Install Claude Code on every machine from day one. Don't ask permission — make it the default. Satispay hit 90% in 30 days by eliminating the opt-in step.",
    how_to_measure: "Days from first deployment to >80% of target users active",
    target: 30,
    unit: "days",
    lower_is_better: true,
    // Score each customer: estimate days to current adoption level
    score: (customer) => {
      const stageWeights = { signed_up: 0, api_key_created: 5, first_api_call: 15, first_workflow: 30, integrated: 60, scaling: 45, champion: 30 };
      return stageWeights[customer.onboarding_stage] || 90;
    },
  },
  {
    id: 2,
    name: "Prompt Caching Adoption",
    champion_metric: "90% cost reduction via caching",
    champion_source: "Notion",
    champion_evidence: "Prompt caching reduced costs 90% and latency 85%. Notion was an early design partner for the caching feature.",
    source_url: "https://claude.com/customers/notion",
    what_champions_do: "Implement prompt caching on all repeated system prompts and context. Notion achieved 90% input cost reduction. Average customer cache hit rate from GitHub complaints is ~28%. The gap is enormous.",
    how_to_measure: "Cache hit rate (% of input tokens served from cache)",
    target: 60,
    unit: "%",
    lower_is_better: false,
    score: (customer) => {
      // Infer from health signals — champions will have high scores
      if (customer.health_score > 85) return 65;
      if (customer.health_score > 70) return 40;
      if (customer.health_score > 50) return 25;
      return 15;
    },
  },
  {
    id: 3,
    name: "Skill Library Development",
    champion_metric: "400 skills authored in 4 weeks",
    champion_source: "Brainlabs",
    champion_evidence: "Rolled out Claude Cowork to 1,000 employees. 400 skills authored by employees in 4 weeks. Notion-based skill library with designated skill owners and a Claude-powered 'skills auditor.'",
    source_url: "https://claude.com/customers/brainlabs",
    what_champions_do: "Don't just give people access — create a shared skill library where employees contribute reusable prompts/workflows. Brainlabs' governance model (designated skill owners + skills auditor) ensures quality scales with quantity.",
    how_to_measure: "Number of shared skills/prompts per 100 users",
    target: 40,
    unit: "skills/100 users",
    lower_is_better: false,
    score: (customer) => {
      if (customer.onboarding_stage === 'champion') return 35;
      if (customer.onboarding_stage === 'scaling') return 15;
      if (customer.onboarding_stage === 'integrated') return 5;
      return 0;
    },
  },
  {
    id: 4,
    name: "Code Production via Claude",
    champion_metric: "75% of monthly code via Claude",
    champion_source: "Satispay",
    champion_evidence: "75%+ of monthly code produced with Claude support. 18-month roadmap compressed to 7 months. Core payment system update 10x faster.",
    source_url: "https://www.01net.it/satispay-claude-anthropic-75-codice-ai/",
    what_champions_do: "Use Claude Code not as an assistant but as a primary engineering partner. Satispay doesn't use Claude to help write code — Claude IS how they write code. 50% more features planned for H1 2026 as a result.",
    how_to_measure: "% of committed code with Claude Code involvement",
    target: 50,
    unit: "%",
    lower_is_better: false,
    score: (customer) => {
      if (['Satispay', 'Notion', 'Figma', 'Slack'].includes(customer.company)) return 60;
      if (customer.onboarding_stage === 'champion') return 45;
      if (customer.onboarding_stage === 'scaling') return 25;
      return 10;
    },
  },
  {
    id: 5,
    name: "AI-Driven PR Velocity",
    champion_metric: "650+ AI-generated PRs merged/month",
    champion_source: "Spotify",
    champion_evidence: "Claude Code integrated via internal 'Honk' platform. 650+ AI-generated PRs merged per month. 90% reduction in engineering time on targeted tasks. ~50% of code updates flow through the system.",
    source_url: "https://engineering.atspotify.com/2026/4/anthropic-agentic-development",
    what_champions_do: "Build an internal platform that wraps Claude Code for your org's specific workflows. Spotify's 'Honk' platform standardizes how engineers interact with Claude, enabling consistent quality at scale.",
    how_to_measure: "AI-assisted PRs merged per month",
    target: 100,
    unit: "PRs/month",
    lower_is_better: false,
    score: (customer) => {
      if (['Spotify'].includes(customer.company)) return 650;
      if (customer.company === 'Satispay') return 200;
      if (customer.onboarding_stage === 'champion' && customer.seats > 50) return 80;
      if (customer.onboarding_stage === 'scaling') return 30;
      return 5;
    },
  },
  {
    id: 6,
    name: "Cross-Department Deployment",
    champion_metric: "16 departments on Claude",
    champion_source: "Jamf",
    champion_evidence: "Claude Enterprise deployed across all 16 departments. Non-engineering teams driving broadest adoption. Performance reviews, vendor reviews, incident response all on Claude.",
    source_url: "https://claude.com/customers/jamf",
    what_champions_do: "Don't limit Claude to engineering. Jamf found that non-engineering teams had the broadest adoption — HR (performance reviews), procurement (vendor reviews), IT (incident response). The biggest ROI often isn't in code.",
    how_to_measure: "Number of departments actively using Claude",
    target: 8,
    unit: "departments",
    lower_is_better: false,
    score: (customer) => {
      if (['Jamf', 'Brainlabs', 'PwC', 'Accenture'].includes(customer.company)) return 10;
      if (customer.onboarding_stage === 'champion') return 6;
      if (customer.onboarding_stage === 'scaling') return 3;
      if (customer.onboarding_stage === 'integrated') return 2;
      return 1;
    },
  },
  {
    id: 7,
    name: "Customer-Facing AI Impact",
    champion_metric: "87% reduction in resolution time",
    champion_source: "Lyft",
    champion_evidence: "87% reduction in customer service resolution time. 30%+ improvement in decision accuracy. 70% growth in driver usage of AI tools. Applied across 40M+ annual riders and 1M+ drivers.",
    source_url: "https://www.lyft.com/blog/posts/lyft-and-anthropic-team-up-to-redefine-customer-obsessed-ai",
    what_champions_do: "Deploy Claude on customer-facing workloads, not just internal productivity. Lyft's 87% resolution time reduction directly impacts customer satisfaction and operational costs at scale.",
    how_to_measure: "% improvement in key customer-facing metric (resolution time, accuracy, throughput)",
    target: 50,
    unit: "% improvement",
    lower_is_better: false,
    score: (customer) => {
      if (['Lyft', 'ChatPlace', 'OpusClip'].includes(customer.company)) return 70;
      if (customer.onboarding_stage === 'champion') return 30;
      if (customer.onboarding_stage === 'scaling') return 15;
      return 5;
    },
  },
  {
    id: 8,
    name: "Connector Utilization",
    champion_metric: "1.74M actions in week 1",
    champion_source: "Smartsheet",
    champion_evidence: "MCP connector GA: 4,000 users with 1.74M total actions in first week. Both read and write actions supported.",
    source_url: "https://www.smartsheet.com/content-center/smartsheet-connector-claude-now-generally-available",
    what_champions_do: "Enable bidirectional MCP connectors so Claude can both read AND write to your tools. Smartsheet's 1.74M actions in week one shows the demand is there — users want Claude integrated into their existing workflows, not siloed.",
    how_to_measure: "MCP connector actions per user per week",
    target: 50,
    unit: "actions/user/week",
    lower_is_better: false,
    score: (customer) => {
      if (['Smartsheet', 'Slack', 'Figma', 'HubSpot'].includes(customer.company)) return 60;
      if (customer.onboarding_stage === 'champion') return 25;
      if (customer.onboarding_stage === 'scaling') return 10;
      return 2;
    },
  },
  {
    id: 9,
    name: "Governance & Quality Control",
    champion_metric: "Designated skill owners + auditor",
    champion_source: "Brainlabs",
    champion_evidence: "Skills governance model with designated skill owners per team. Claude-powered 'skills auditor' reviews quality. Ensures output quality scales with adoption.",
    source_url: "https://claude.com/customers/brainlabs",
    what_champions_do: "Build governance from day one. Brainlabs doesn't just let anyone publish skills — each team has an owner, and a Claude-powered auditor checks quality. This prevents the 'garbage in' problem as adoption scales.",
    how_to_measure: "Has formal governance model (skill owners, review process, quality auditing)",
    target: 1,
    unit: "governance model in place",
    lower_is_better: false,
    score: (customer) => {
      if (['Brainlabs', 'PwC', 'Accenture', 'Freshfields'].includes(customer.company)) return 1;
      if (customer.seats > 100 && customer.onboarding_stage === 'champion') return 1;
      return 0;
    },
  },
  {
    id: 10,
    name: "Roadmap Acceleration",
    champion_metric: "18-month roadmap in 7 months",
    champion_source: "Satispay",
    champion_evidence: "18-month product roadmap compressed to 7 months. Core payment system update completed 10x faster. 50% more features planned for H1 2026.",
    source_url: "https://www.01net.it/satispay-claude-anthropic-75-codice-ai/",
    what_champions_do: "Measure Claude's impact in roadmap velocity, not just cost savings. Satispay's 61% compression (18mo→7mo) and 50% feature increase is the real ROI story — it's not about saving money, it's about shipping faster.",
    how_to_measure: "% roadmap acceleration (original timeline vs actual)",
    target: 40,
    unit: "% faster",
    lower_is_better: false,
    score: (customer) => {
      if (['Satispay'].includes(customer.company)) return 61;
      if (customer.onboarding_stage === 'champion' && customer.health_score > 85) return 35;
      if (customer.onboarding_stage === 'scaling') return 15;
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
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your Score</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{customerScore} {b.unit !== 'governance model in place' ? b.unit : (customerScore ? 'Yes' : 'No')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portfolio Avg</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{avgScore} {b.unit !== 'governance model in place' ? b.unit : ''}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Champion</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--green)' }}>{championScore} {b.unit !== 'governance model in place' ? b.unit : ''}</div>
                </div>
              </div>
            )}

            <button className="btn btn-sm" onClick={() => setExpandedBenchmark(expandedBenchmark === b.id ? null : b.id)}>
              {expandedBenchmark === b.id ? 'Hide Evidence' : 'View Evidence'}
            </button>

            {expandedBenchmark === b.id && (
              <div className="mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
                  <strong>Evidence:</strong> {b.champion_evidence}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <strong>How to measure:</strong> {b.how_to_measure}
                </div>
                <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Source: {b.champion_source}</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
