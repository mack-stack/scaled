// Benchmark Scoring Engine
// Derives health scores from champion benchmark performance
// Methodology: score each company on 10 real champion behaviors,
// normalize to 0-100, flag outliers beyond 2 SD from mean

import { DEMO_CUSTOMERS } from './demo-data';

// Champion benchmarks — condensed scoring functions
// Each returns a raw score (higher = better, except where lower_is_better)
const BENCHMARKS = [
  {
    id: 1, name: "Time to Org-Wide Adoption",
    champion: "Satispay: 90% adoption in 30 days",
    max_score: 100,
    lower_is_better: true,
    score: (c) => {
      // Days to current adoption level — inferred from onboarding stage
      const days = { signed_up: 0, api_key_created: 5, first_api_call: 15, first_workflow: 30, integrated: 60, scaling: 45, champion: 30 };
      const raw = days[c.onboarding_stage] || 90;
      return Math.max(0, 100 - raw); // Invert: fewer days = higher score
    },
  },
  {
    id: 2, name: "Prompt Caching Adoption",
    champion: "Notion: 90% cost reduction via caching",
    max_score: 100,
    score: (c) => {
      // Known caching adopters get high scores; infer from evidence
      if (c.evidence && c.evidence.toLowerCase().includes('cach')) return 85;
      if (c.onboarding_stage === 'champion') return 55;
      if (c.onboarding_stage === 'scaling') return 35;
      if (c.onboarding_stage === 'integrated') return 20;
      return 10;
    },
  },
  {
    id: 3, name: "Skill Library / Reusable Workflows",
    champion: "Brainlabs: 400 skills in 4 weeks",
    max_score: 100,
    score: (c) => {
      if (c.evidence && (c.evidence.toLowerCase().includes('skill') || c.evidence.toLowerCase().includes('workflow'))) return 80;
      if (c.known_products && c.known_products.some(p => p.includes('Cowork') || p.includes('Managed'))) return 50;
      if (c.onboarding_stage === 'champion') return 40;
      if (c.onboarding_stage === 'scaling') return 20;
      return 5;
    },
  },
  {
    id: 4, name: "Code Production via Claude",
    champion: "Satispay: 75% of code via Claude",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('code') && c.evidence.toLowerCase().includes('%')) return 75;
      if (c.known_products && c.known_products.some(p => p.toLowerCase().includes('code'))) return 50;
      if (c.onboarding_stage === 'champion') return 35;
      if (c.onboarding_stage === 'scaling') return 20;
      return 5;
    },
  },
  {
    id: 5, name: "AI-Driven PR Velocity",
    champion: "Spotify: 650+ PRs/month",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('pr')) return 80;
      if (c.known_products && c.known_products.some(p => p.toLowerCase().includes('code') || p.toLowerCase().includes('agent sdk'))) return 40;
      if (c.onboarding_stage === 'champion' && c.seats > 50) return 30;
      return 5;
    },
  },
  {
    id: 6, name: "Cross-Department Deployment",
    champion: "Jamf: 16 departments",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('department')) return 80;
      if (c.evidence && (c.evidence.toLowerCase().includes('company-wide') || c.evidence.toLowerCase().includes('workforce') || c.evidence.toLowerCase().includes('campus-wide'))) return 70;
      if (c.onboarding_stage === 'champion') return 45;
      if (c.onboarding_stage === 'scaling') return 25;
      if (c.onboarding_stage === 'integrated') return 15;
      return 5;
    },
  },
  {
    id: 7, name: "Customer-Facing AI Impact",
    champion: "Lyft: 87% reduction in resolution time",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('customer')) return 60;
      if (c.evidence && (c.evidence.toLowerCase().includes('resolution') || c.evidence.toLowerCase().includes('support'))) return 70;
      if (c.known_products && c.known_products.some(p => p.toLowerCase().includes('api'))) return 30;
      if (c.onboarding_stage === 'champion') return 25;
      return 5;
    },
  },
  {
    id: 8, name: "MCP/Connector Utilization",
    champion: "Smartsheet: 1.74M actions week 1",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('mcp')) return 70;
      if (c.known_products && c.known_products.some(p => p.toLowerCase().includes('mcp') || p.toLowerCase().includes('connector'))) return 55;
      if (c.onboarding_stage === 'champion') return 20;
      return 5;
    },
  },
  {
    id: 9, name: "Governance & Quality Control",
    champion: "Brainlabs: skill owners + auditor",
    max_score: 100,
    score: (c) => {
      if (c.evidence && (c.evidence.toLowerCase().includes('governance') || c.evidence.toLowerCase().includes('auditor'))) return 90;
      if (c.evidence && c.evidence.toLowerCase().includes('platform')) return 50;
      if (c.seats > 1000) return 30; // Large orgs more likely to have governance
      if (c.onboarding_stage === 'champion') return 25;
      return 5;
    },
  },
  {
    id: 10, name: "Roadmap Acceleration",
    champion: "Satispay: 18-month roadmap in 7 months",
    max_score: 100,
    score: (c) => {
      if (c.evidence && c.evidence.toLowerCase().includes('roadmap')) return 85;
      if (c.evidence && (c.evidence.toLowerCase().includes('faster') || c.evidence.toLowerCase().includes('10x'))) return 70;
      if (c.evidence && (c.evidence.toLowerCase().includes('reduction') || c.evidence.toLowerCase().includes('improvement'))) return 50;
      if (c.onboarding_stage === 'champion') return 35;
      if (c.onboarding_stage === 'scaling') return 20;
      return 5;
    },
  },
];

// Score a single customer across all benchmarks
export function scoreCustomer(customer) {
  const scores = BENCHMARKS.map(b => ({
    benchmark_id: b.id,
    benchmark_name: b.name,
    champion_ref: b.champion,
    raw_score: b.score(customer),
    max_score: b.max_score,
    normalized: Math.round((b.score(customer) / b.max_score) * 100),
  }));

  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.normalized, 0) / scores.length);

  // Find biggest gaps (lowest scores) — these become plays
  const gaps = [...scores]
    .sort((a, b) => a.normalized - b.normalized)
    .slice(0, 3)
    .map(s => ({
      benchmark: s.benchmark_name,
      champion_ref: s.champion_ref,
      score: s.normalized,
      gap: 100 - s.normalized,
    }));

  return { scores, avgScore, gaps };
}

// Score all customers and compute health distribution
export function scoreAllCustomers() {
  const customers = DEMO_CUSTOMERS.customers;

  const scored = customers.map(c => {
    const result = scoreCustomer(c);
    return {
      ...c,
      benchmark_score: result.avgScore,
      benchmark_gaps: result.gaps,
      benchmark_detail: result.scores,
    };
  });

  // Compute mean and standard deviation
  const allScores = scored.filter(c => !c.churn).map(c => c.benchmark_score);
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const variance = allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length;
  const stdDev = Math.sqrt(variance);

  // Assign health status based on 2 SD methodology
  const withHealth = scored.map(c => {
    let health_status, health_score;

    if (c.churn) {
      health_status = 'critical';
      health_score = 5;
    } else if (c.at_risk) {
      health_status = 'at_risk';
      health_score = Math.min(c.benchmark_score, 30);
    } else if (c.benchmark_score < mean - 2 * stdDev) {
      health_status = 'critical';
      health_score = c.benchmark_score;
    } else if (c.benchmark_score < mean - 1 * stdDev) {
      health_status = 'at_risk';
      health_score = c.benchmark_score;
    } else if (c.benchmark_score < mean) {
      health_status = 'monitor';
      health_score = c.benchmark_score;
    } else {
      health_status = 'healthy';
      health_score = c.benchmark_score;
    }

    return { ...c, health_status, health_score };
  });

  return {
    customers: withHealth,
    stats: {
      mean: Math.round(mean),
      stdDev: Math.round(stdDev),
      threshold_critical: Math.round(mean - 2 * stdDev),
      threshold_at_risk: Math.round(mean - 1 * stdDev),
      methodology: `Health score = average of 10 champion benchmark scores (0-100). Status: healthy (≥ mean), monitor (< mean), at_risk (< mean - 1σ), critical (< mean - 2σ). Mean: ${Math.round(mean)}, σ: ${Math.round(stdDev)}.`,
    },
  };
}

// Generate plays from benchmark gaps
export function generatePlaysFromBenchmarks() {
  const { customers } = scoreAllCustomers();

  const plays = [];
  customers
    .filter(c => !c.churn) // Don't generate plays for churned accounts
    .forEach(c => {
      c.benchmark_gaps.forEach((gap, i) => {
        if (gap.gap > 50) { // Only create plays for significant gaps
          plays.push({
            company: c.company,
            customer_id: c.id,
            play_type: 'benchmark_gap',
            priority: c.arr * (gap.gap / 100), // ARR-weighted gap = priority
            benchmark: gap.benchmark,
            champion_ref: gap.champion_ref,
            current_score: gap.score,
            gap_size: gap.gap,
            arr: c.arr,
            recommendation: `${c.company} scores ${gap.score}/100 on "${gap.benchmark}" vs champion benchmark. ${gap.champion_ref}. Closing this gap represents the highest-impact CS play for this account.`,
          });
        }
      });
    });

  // Sort by priority (ARR × gap)
  plays.sort((a, b) => b.priority - a.priority);

  return plays;
}

export { BENCHMARKS };
