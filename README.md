# Scaled

**AI-Native Scaled Customer Success Platform**

A working prototype demonstrating how Claude can power programmatic customer success at scale — replacing manual CSM touchpoints with intelligent, automated engagement.

Built as a portfolio piece for the **Customer Success Programs Manager** role at Anthropic.

## The Problem

Anthropic's CS org faces three simultaneous challenges:
1. **Token economics confusion** — Enterprise billing shifted from bundled seats to usage-based pricing (April 2026), causing 2-3x cost increases for heavy users
2. **Trust deficit** — A 6-week Claude Code quality degradation (March-April 2026) shook customer confidence
3. **Scale gap** — 300K+ business customers, 54% of enterprise logos arriving self-serve, no scaled CS playbook yet

## The Solution

Scaled is a unified platform with four modules, all powered by Claude:

### Module 1: Token Health Monitor
Claude analyzes customer usage patterns, flags burn rate anomalies, and drafts optimization recommendations. Turns token economics from a pain point into a proactive CS touchpoint.

### Module 2: Incident Response Engine
Ingests status signals, segments impacted customers by severity and usage pattern, and generates personalized communications per segment. Turns reactive firefighting into orchestrated response.

### Module 3: Onboarding Autopilot
A lifecycle state machine where Claude generates contextual next steps based on what each customer has and hasn't done. Activates self-serve enterprise customers with zero CSM touch.

### Module 4: Telemetry & Plays Dashboard
The unified view — signal-to-action mapping, health scores across the portfolio, play execution tracking. The CS Programs Manager's cockpit.

## Stack

- **Backend:** Python + FastAPI
- **Database:** PostgreSQL (SQLAlchemy + Alembic)
- **AI Engine:** Claude API (Anthropic SDK)
- **Frontend:** React dashboard
- **Auth:** API key (demo mode)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Initialize database
python -m scaled.db.init

# Seed demo data
python -m scaled.db.seed

# Run the API server
uvicorn scaled.api.main:app --reload

# Run the dashboard
cd dashboard && npm install && npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Dashboard (React)                │
├─────────────────────────────────────────────────┤
│                  FastAPI Gateway                  │
├───────────┬───────────┬───────────┬─────────────┤
│  Token    │ Incident  │ Onboard   │  Telemetry  │
│  Health   │ Response  │ Autopilot │  & Plays    │
│  Monitor  │ Engine    │           │  Dashboard  │
├───────────┴───────────┴───────────┴─────────────┤
│              Claude AI Engine                     │
├─────────────────────────────────────────────────┤
│              PostgreSQL                           │
└─────────────────────────────────────────────────┘
```

## Author

**Mack Ortis** — 7+ years Meta (WhatsApp Product), Sand Castle Studios founder, Claude Code power user.

This isn't a mockup. It's the first 90 days of the job, already built.
