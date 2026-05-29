# Cover Letter — Customer Success Programs Manager, Anthropic

**Mack Ortis**

---

I'm not going to tell you I can build Claude-powered CS programs. I'm going to show you.

Attached to this application is **Scaled** — a working prototype of an AI-native scaled customer success platform. Four modules, 29 API endpoints, 16 simulated customers across your actual segments (DNB, Strategics, Industries, Self-Serve, Small Business), 90 days of realistic usage data, and your real March-April 2026 incidents modeled in. It's not a deck. It's the first 90 days of this job, already built.

I built it with Claude. In one session.

## Why I Built This

Your listing asks for someone with "a restless 'how could we do this with Claude?' reflex." I don't have that reflex — I have the muscle memory. For the past year, I've been running Sand Castle Studios, an artist development company, with Claude as the operational backbone. Not as a chatbot. As the system.

Here's what that looks like in practice:

- **Claude as band manager.** I gave Claude the GM role for my band WithoutSpaces — 7 operating systems (production, distribution, content, live shows, competitions, merch, fan platform), daily accountability reminders to each band member, weekly scorecards, monthly strategy reviews. It runs the business.

- **10 Claude Code instances coordinating autonomously.** Right now, I have 10 Claude Code instances running across two machines, communicating through a custom SSH-based intercom protocol I built. They have callsigns. They broadcast build briefs to each other. When one instance loads data into a database, it messages another instance with the schema so that instance can auto-generate dashboard views. No orchestration framework. Just Claude Code, SSH, and file-based messaging.

- **A production pipeline from AI to tape.** Songs generated in Suno → stems extracted via API → MIDI converted → rebuilt through real amplifiers and microphones → mixed ITB → mastered to 8-track tape. Claude orchestrates every stage, from pulling stems to loading plugin chains to comping tracks down to mastering buses.

- **1.2 million artists in a Postgres database.** I built and maintain the most comprehensive dataset on unsigned indie artists in the US — scraping BandLab, Suno, competition platforms, and MusicBrainz, cross-referencing social handles, enriching with discography data. Claude runs the scrapers, the ETL, and the analysis.

- **Three reverse-engineered APIs.** LANDR's GraphQL API (upload, stems, download, library), Suno's internal API (search, trending, profiles, stem separation), and Amplifier's competition platform API (75 campaigns, 16 clients cataloged). I didn't read docs — I opened Dev Tools and mapped the endpoints. Claude helped me build the clients.

- **A $0.68/landing-page-view ad pipeline** that took my band from #21 to #3 in a national Battle of the Bands competition. Full pixel stack (TikTok + Meta, browser + server-side CAPI), A/B landing pages, vote-again conversion loops. $800 total spend, 813 votes.

Every one of these is a "manual workflow replaced by an agent." I didn't build them because I read about AI automation. I built them because I needed to run a company with three people and no budget, and Claude made it possible.

## Why This Role

Before Sand Castle Studios, I spent 7+ years at Meta on WhatsApp product. I know what it looks like when a platform scales faster than its support infrastructure — and what it costs when customers feel unseen. I also know that the answer isn't more headcount. It's better systems.

Your CS org is in that moment right now. 300,000+ business customers. 54% of new enterprise logos arriving self-serve. A pricing model that just shifted from predictable seat-based billing to usage-based token economics that's catching customers off guard. A trust deficit from the March-April quality incident. And a scaled CS function that's being built from zero.

I know this because I researched it. The same way I researched every competition my band entered, every API I reverse-engineered, every market I analyzed. I don't apply to jobs. I study the problem first.

**Scaled** — the prototype — addresses your three most urgent challenges:

1. **Token Health Monitor** — Claude analyzes customer usage patterns, computes burn rate against commitments, flags model mix inefficiencies, and drafts optimization recommendations. Turns the pricing shift from a pain point into a proactive CS touchpoint.

2. **Incident Response Engine** — Cross-references incident data against each customer's actual usage to compute personalized impact scores. Segments customers into tiers and generates tier-appropriate communications. The caching bug affected your Claude Code heavy users differently than your batch API users — this system knows the difference.

3. **Onboarding Autopilot** — A lifecycle state machine that evaluates customer behavior against onboarding stages, detects stalls, and generates contextual nudges. For the 54% of enterprise logos that arrive self-serve and will never get a CSM.

4. **Telemetry & Plays Dashboard** — The unified cockpit. Signals from all three modules feed into automated play detection — expansion opportunities, churn risks, reactivation targets — with a priority queue for execution.

It runs on FastAPI, PostgreSQL, and the Claude API. Every module degrades gracefully without an API key (heuristic analysis), and upgrades to Claude-generated insights when one is present. It's not a mockup. `uvicorn scaled.api.main:app --reload` and it's live.

## The Fit

Your required qualifications, mapped:

| You Need | I Have |
|----------|--------|
| 6-8+ years CS, digital/scaled | 7+ years Meta (WhatsApp), building scaled systems for SCS |
| Measurable outcomes without 1:1 | #3 national BoB from $800 ad spend, 1.2M artist database, zero dedicated CSMs |
| Hands-on AI fluency, prototyped agents | 10 simultaneous Claude Code instances, custom intercom, full production pipeline |
| 1:many engagements | Battle of the Bay live events, practice.withoutspaces.band, vote funnel |
| Data instincts, consumption dashboards | Built Scaled's telemetry module. Also: competition intel DB, Suno scraper, assumption models |
| Technical literacy, API-first products | Reverse-engineered 3 APIs, built on Claude API, TikTok Events API, Meta CAPI |
| Excellent written communication | You're reading it |
| Token economics + Claude Code workflows | I run Claude Code across multiple machines daily. I built a token health monitor for this application. |

Your preferred qualification says: *"Instinct to replace manual workflows with automated agents."*

I don't have the instinct. I have the portfolio. Every system I've described exists and runs. The intercom is active right now. The database has 1.2 million rows. The prototype is deployable.

I'm not a candidate who will need to learn what Claude-native CS looks like. I've been living it — and I built the proof.

---

**Mack Ortis**
mack@sandcastle-studios.com
