import { useState } from 'react';

// Real data from anthropics/claude-code GitHub issues — scraped May 29, 2026
const COMMUNITY_DATA = {
  source: "github.com/anthropics/claude-code",
  scraped_at: "2026-05-29",
  total_issues_analyzed: 50,
  categories: [
    {
      name: "Cost & Quota",
      severity: "critical",
      issue_count: 9,
      total_comments: 3839,
      summary: "Token economics and usage limits are the #1 community pain point. Users report hitting Max subscription limits in minutes instead of hours, abnormal quota drain, and cache TTL regressions inflating costs.",
      cs_playbook: "Proactive token economics webinar series, automated burn-rate alerts, self-serve cost optimization guide, dedicated 'quota health check' in onboarding flow.",
      top_issues: [
        { number: 16157, title: "Instantly hitting usage limits with Max subscription", comments: 1472, state: "open", url: "https://github.com/anthropics/claude-code/issues/16157" },
        { number: 38335, title: "Max plan session limits exhausted abnormally fast since March 23, 2026", comments: 740, state: "open", url: "https://github.com/anthropics/claude-code/issues/38335" },
        { number: 53262, title: "HERMES.md in git commit messages causes requests to route to extra usage billing", comments: 92, state: "closed", url: "https://github.com/anthropics/claude-code/issues/53262" },
        { number: 46829, title: "Cache TTL silently regressed from 1h to 5m, causing quota and cost inflation", comments: 56, state: "closed", url: "https://github.com/anthropics/claude-code/issues/46829" },
        { number: 46917, title: "CC v2.1.100+ inflates cache_creation by ~20K tokens vs v2.1.98", comments: 39, state: "open", url: "https://github.com/anthropics/claude-code/issues/46917" },
      ],
    },
    {
      name: "Model Quality",
      severity: "high",
      issue_count: 2,
      total_comments: 762,
      summary: "Users reported Claude Code becoming 'unusable for complex engineering tasks' after Feb 2026 updates (reasoning effort downgrade). The classic 'You're absolutely right!' sycophancy issue persists as a trust concern.",
      cs_playbook: "Post-incident trust rebuild campaign, model changelog communications, 'what changed and why' transparency emails to heavy users, feedback loop for quality regression reports.",
      top_issues: [
        { number: 42796, title: "Claude Code is unusable for complex engineering tasks with the Feb updates", comments: 583, state: "closed", url: "https://github.com/anthropics/claude-code/issues/42796" },
        { number: 3382, title: "Claude says 'You're absolutely right!' about everything", comments: 179, state: "closed", url: "https://github.com/anthropics/claude-code/issues/3382" },
      ],
    },
    {
      name: "UX & Terminal",
      severity: "medium",
      issue_count: 15,
      total_comments: 1746,
      summary: "Persistent terminal scrolling/flickering issues across platforms. The 'Bring Back Buddy' plea (254 comments) shows strong community attachment to deprecated features. Copy/paste formatting issues affect daily workflows.",
      cs_playbook: "Known issues knowledge base, workaround guides for top UX bugs, community feedback synthesis for product team, 'tips & tricks' onboarding content.",
      top_issues: [
        { number: 826, title: "Console scrolling top of history when Claude adds text", comments: 351, state: "open", url: "https://github.com/anthropics/claude-code/issues/826" },
        { number: 45596, title: "Bring Back Buddy — A Consolidated Plea from the Community", comments: 254, state: "open", url: "https://github.com/anthropics/claude-code/issues/45596" },
        { number: 769, title: "In-progress call causes screen flickering", comments: 303, state: "open", url: "https://github.com/anthropics/claude-code/issues/769" },
        { number: 1913, title: "Terminal Flickering", comments: 187, state: "open", url: "https://github.com/anthropics/claude-code/issues/1913" },
        { number: 18170, title: "Copy/paste from terminal includes unwanted indentation", comments: 119, state: "open", url: "https://github.com/anthropics/claude-code/issues/18170" },
      ],
    },
    {
      name: "Feature Requests",
      severity: "info",
      issue_count: 8,
      total_comments: 1073,
      summary: "AGENTS.md support is the #1 feature request (304 comments). Multi-account switching, MCP tool filtering, and undo/checkpoint features show demand for power-user workflows and team management.",
      cs_playbook: "Feature request tracking dashboard, 'coming soon' roadmap comms for top-voted items, power user cohort program, early access/beta programs for requested features.",
      top_issues: [
        { number: 6235, title: "Support AGENTS.md", comments: 304, state: "open", url: "https://github.com/anthropics/claude-code/issues/6235" },
        { number: 27302, title: "Support multiple Connector accounts", comments: 189, state: "open", url: "https://github.com/anthropics/claude-code/issues/27302" },
        { number: 18435, title: "Manage multiple Claude accounts with easy switching", comments: 105, state: "open", url: "https://github.com/anthropics/claude-code/issues/18435" },
        { number: 2511, title: "Connect Claude Code to Claude Projects", comments: 47, state: "open", url: "https://github.com/anthropics/claude-code/issues/2511" },
        { number: 353, title: "Undo/Checkpoint Feature for Correcting AI-Generated Code", comments: 83, state: "closed", url: "https://github.com/anthropics/claude-code/issues/353" },
      ],
    },
    {
      name: "Onboarding & Access",
      severity: "high",
      issue_count: 5,
      total_comments: 1184,
      summary: "Phone verification (738 comments) is a massive onboarding blocker. OpenCode/Max plan support confusion shows pricing model friction. Cowork creates 10GB VM bundles degrading performance for new users.",
      cs_playbook: "Streamlined onboarding flow audit, phone verification alternative paths, plan comparison guide, 'getting started' automation to bypass known friction points.",
      top_issues: [
        { number: 34229, title: "Phone verification blocking access", comments: 738, state: "open", url: "https://github.com/anthropics/claude-code/issues/34229" },
        { number: 17118, title: "Support for OpenCode and Max plan", comments: 410, state: "closed", url: "https://github.com/anthropics/claude-code/issues/17118" },
        { number: 22543, title: "Cowork feature creates 10GB VM bundle that degrades performance", comments: 73, state: "open", url: "https://github.com/anthropics/claude-code/issues/22543" },
      ],
    },
    {
      name: "API & Reliability",
      severity: "high",
      issue_count: 6,
      total_comments: 893,
      summary: "Stream idle timeouts, tool use concurrency errors, and conversation history invalidation are ongoing reliability concerns. The 400 Bad Request concurrency bug (270 comments) was a major pain point across platforms.",
      cs_playbook: "Reliability status dashboard for enterprise customers, automated retry guidance, API best practices guide, proactive outreach during degraded performance windows.",
      top_issues: [
        { number: 8763, title: "API Error: 400 due to tool use concurrency issues", comments: 270, state: "closed", url: "https://github.com/anthropics/claude-code/issues/8763" },
        { number: 46987, title: "Stream idle timeout — partial response received", comments: 183, state: "open", url: "https://github.com/anthropics/claude-code/issues/46987" },
        { number: 40524, title: "Conversation history invalidated on subsequent turns", comments: 124, state: "closed", url: "https://github.com/anthropics/claude-code/issues/40524" },
        { number: 20571, title: "VS Code extension: Tool use concurrency error after Jan update", comments: 133, state: "open", url: "https://github.com/anthropics/claude-code/issues/20571" },
      ],
    },
  ],
};

const SEVERITY_COLORS = {
  critical: 'var(--red)',
  high: 'var(--orange)',
  medium: 'var(--yellow)',
  info: 'var(--blue)',
};

export default function Community() {
  const [expanded, setExpanded] = useState(null);

  const totalComments = COMMUNITY_DATA.categories.reduce((sum, c) => sum + c.total_comments, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Community Intelligence</h1>
        <p>Real customer signals from {COMMUNITY_DATA.source} — scraped {COMMUNITY_DATA.scraped_at}</p>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-label">Issues Analyzed</div>
          <div className="card-value">{COMMUNITY_DATA.total_issues_analyzed}</div>
        </div>
        <div className="card">
          <div className="card-label">Total Comments</div>
          <div className="card-value">{totalComments.toLocaleString()}</div>
          <div className="card-sub">Community signal strength</div>
        </div>
        <div className="card">
          <div className="card-label">Pain Categories</div>
          <div className="card-value">{COMMUNITY_DATA.categories.length}</div>
        </div>
        <div className="card">
          <div className="card-label">#1 Pain Point</div>
          <div className="card-value text-red" style={{ fontSize: '18px' }}>Quota Drain</div>
          <div className="card-sub">1,472 comments on top issue alone</div>
        </div>
      </div>

      {COMMUNITY_DATA.categories.map((cat, i) => (
        <div className="card mb-4" key={i} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ color: SEVERITY_COLORS[cat.severity], fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {cat.name}
              </span>
              <span className="text-muted" style={{ marginLeft: '12px', fontSize: '12px' }}>
                {cat.issue_count} issues / {cat.total_comments.toLocaleString()} comments
              </span>
            </div>
            <span className={`badge badge-${cat.severity === 'critical' ? 'critical' : cat.severity === 'high' ? 'at_risk' : cat.severity === 'medium' ? 'monitor' : 'healthy'}`}>
              {cat.severity}
            </span>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>{cat.summary}</p>

          <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '4px' }}>
              CS Playbook Recommendation
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{cat.cs_playbook}</div>
          </div>

          <button className="btn btn-sm" onClick={() => setExpanded(expanded === i ? null : i)}>
            {expanded === i ? 'Hide Issues' : `View ${cat.top_issues.length} Top Issues`}
          </button>

          {expanded === i && (
            <div className="mt-4">
              {cat.top_issues.map((issue) => (
                <div key={issue.number} className="detail-row" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '13px' }}>
                      #{issue.number}: {issue.title}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontSize: '12px' }}>{issue.comments}c</span>
                    <span className={`badge ${issue.state === 'open' ? 'badge-at_risk' : 'badge-healthy'}`}>
                      {issue.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
