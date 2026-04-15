# AgentFolio — Next Planning Queue

Tracks what still needs to be planned and executed. All initially-sketched phases (1-8) are shipped on `main`.

## Shipped

- **Phase 1 — Known-company adaptation** (`2026-04-15-phase1-known-company-adaptation.md`)
- **Phase 2 — Live adaptation via issues** (`2026-04-15-phase2-live-adaptation-generation.md`)
- **Phase 3 — Analytics pipeline** (`2026-04-15-phase3-analytics-pipeline.md`)
- **Phase 4 — Issue-triggered chat widget** (`2026-04-15-phase4-issue-triggered-chat.md`) — smoke-tested on issue #5
- **Phase 5 — Architecture page** (`2026-04-15-phase5-architecture-page.md`) — live at `/how-it-works`
- **Phase 6 — JD auto-fetching** (`2026-04-15-phase6-jd-auto-fetching.md`) — daily cron, stale-safe
- **Phase 7 — LLM summary rewriting** (`2026-04-15-phase7-llm-summary-rewriting.md`) — cached by SHA1
- **Phase 8 — Match-score refinement** (`2026-04-15-phase8-match-score-refinement.md`) — cohere 0.70

## Known follow-ups (not yet planned)

- **Match-score discrimination fix.** Phase 8 raised default's score to 0.71 because `data/companies/default.json` has broad `priority_tags` (`full-stack`, `agentic`, `customer-facing`) that hit many bullets/projects. Options:
  - Narrow `default.priority_tags` to terms so generic they rarely match (or empty them entirely).
  - Weight tag matches inversely by how many profiles share the tag (rare tags count more).
  - Introduce a `tailored_score` separate from `overall` that only counts matches above a rarity threshold.
- **JD keyword extraction quality.** Phase 6 only extracts the narrow `KEYWORD_VOCAB` and the initial live run on cohere pulled just `JavaScript, Java` because the placeholder `jd_url` redirected to Ashby's login page. Needs either a smarter extractor (NER / LLM-assisted), or real per-company JD URLs fed in.
- **Live-adaptation LLM polish.** `adapt_on_request.py` doesn't currently pass `--llm`; the issue-triggered pipeline still emits the raw templated summary. Wiring it is a one-line change but adds Anthropic cost per adapt-request.

## Repository state

- **Branch:** `main` (Phases 1-8 merged and deployed)
- **Live:** https://verkyyi.github.io/agentfolio/
- **Data:** `data/analytics.json` auto-refreshes weekly (Sunday 06:00 UTC). `data/llm_cache/` grows with scheduled `adapt.yml` runs. `data/companies/` refreshed daily by `jd-sync.yml`.
- **Secrets:** `GH_ISSUES_PAT` (baked into client), `ANTHROPIC_API_KEY` (server-only, used by chat + polish).

## How to resume in a new session

1. Read `MEMORY.md` (auto-loaded) — it points at the current phase-status snapshot.
2. Verify current state matches memory — decay is real, especially `data/analytics.json` and `data/adapted/*.json`.
3. For new work, use `superpowers:brainstorming` → `superpowers:writing-plans` → subagent-driven execution.
