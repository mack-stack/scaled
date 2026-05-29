# Scaled — AI-Native Scaled Customer Success Platform

## What This Is
Portfolio piece for Anthropic's Customer Success Programs Manager role. A working prototype demonstrating Claude-powered programmatic CS at scale.

## Architecture
- **Backend:** Python + FastAPI at `scaled/`
- **Database:** PostgreSQL (local or NAS at 192.168.50.254:5433)
- **AI Engine:** Claude API via `scaled/core/claude.py` (`ask_claude()` helper)
- **Frontend:** React + Vite dashboard at `dashboard/`

## Module Map
| Module | Path | API Prefix | Purpose |
|--------|------|------------|---------|
| Token Health Monitor | `scaled/modules/token_health/` | `/api/token-health/` | Usage analysis, burn rate alerts, optimization recs |
| Incident Response Engine | `scaled/modules/incident_response/` | `/api/incidents/` | Impact assessment, segmented comms, incident lifecycle |
| Onboarding Autopilot | `scaled/modules/onboarding/` | `/api/onboarding/` | Lifecycle state machine, stall detection, nudges |
| Telemetry & Plays | `scaled/modules/telemetry/` | `/api/telemetry/` | Portfolio dashboard, signal→play mapping, reports |

## Running
```bash
# Backend
pip install -r requirements.txt
cp .env.example .env  # add ANTHROPIC_API_KEY
python -m scaled.db.seed
uvicorn scaled.api.main:app --reload

# Dashboard
cd dashboard && npm install && npm run dev
```

## Data Model
Core tables: customers, usage_events, health_checks, incidents, plays, communications.
Seed data simulates 16 customers across all Anthropic segments with 90 days of realistic usage patterns.

## Key Design Decisions
- Claude generates analysis/recommendations but signal detection is deterministic (data-driven)
- Graceful degradation when ANTHROPIC_API_KEY isn't set — returns data without Claude narrative
- Play detection is idempotent — won't create duplicate plays for same signal
- All modules share the same customer/usage data model — unified platform, not 4 separate tools
