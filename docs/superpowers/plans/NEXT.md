# AgentFolio — Next Planning Queue

Tracks what still needs to be planned and executed after Phase 3 ships.

## Ready to execute (plans written)

- **Phase 4 — Issue-triggered chat widget** (`2026-04-15-phase4-issue-triggered-chat.md`)
  - Prerequisite: user must create an Anthropic API key with monthly spend cap ($5), set as Actions secret `ANTHROPIC_API_KEY`.
  - 9 tasks · adds `chat_answer.py`, `chat-on-request.yml`, `chatApi`, `useChat`, `ChatWidget`.
  - Deploy smoke test: `gh issue create --label chat-request ...` should trigger Action and get a `status: answer` comment.

- **Phase 5 — Architecture page** (`2026-04-15-phase5-architecture-page.md`)
  - No new secrets required.
  - 6 tasks · adds `ArchitecturePage`, `AgentStats`, `AdaptationComparison`, `useAnalytics`, `/how-it-works` route.
  - Renders `data/analytics.json` aggregated stats + side-by-side adaptation comparison.

## To plan (not yet written)

- **Phase 6 — JD auto-fetching**
  - `scripts/fetch_jds.py` + `scripts/tests/test_fetch_jds.py` — parse job-posting URLs (Ashby, Greenhouse, Lever, direct HTML) and emit keyword/skill lists.
  - `.github/workflows/jd-sync.yml` — daily cron that re-fetches `jd_url` for each company profile and updates `jd_keywords`/`skill_emphasis`.
  - Changes: modifies `data/companies/*.json` in-place (commits if keywords diff), triggers `adapt.yml` downstream.
  - Risk: JD URLs rot. Fallback behavior: if 404, keep last-known keywords, flag the profile with `stale: true`.

- **Phase 7 — LLM-powered summary rewriting**
  - Optional pass in `adapt_one.py`: after template substitution, send summary + JD keywords to Claude for a polish. Gated by `--llm` CLI flag (scheduled runs enable it; tests don't).
  - Requires `ANTHROPIC_API_KEY` (already provisioned for Phase 4).
  - Risk: non-determinism across runs → diff noise. Mitigation: seed via temperature=0 + cache by (base_summary, keyword_set) hash.

- **Phase 8 — Match-score refinement**
  - Current `score_skill_match` only counts skill-string keyword hits. Expand to score across `experience.bullets[].tags`, `projects[].tags`, and weighted keyword matches.
  - Target: raise Cohere match from ~24% to ≥70%.
  - No new files; modifies `scripts/adapt_one.py` and its tests.

## Session state at wrap-up

- **Branch:** `main` (Phases 1-3 merged and deployed)
- **Open feature branches:** `phase1-known-company-adaptation`, `phase2-live-adaptation-generation`, `phase3-analytics-pipeline` — can be pruned.
- **Live:** https://verkyyi.github.io/agentfolio/
- **Data:** `data/analytics.json` generated once during Phase 3 smoke test; will auto-refresh weekly via `analytics.yml` on Sunday 06:00 UTC.

## How to resume in a new session

1. Open with: "Continue Phase 4 from `docs/superpowers/plans/2026-04-15-phase4-issue-triggered-chat.md` using subagent-driven development."
2. Hand over the Anthropic API key status (created/not-created) and the `gh secret` command output.
3. For Phase 5, open with: "Execute Phase 5 from the plan at `docs/superpowers/plans/2026-04-15-phase5-architecture-page.md`."
4. For Phases 6-8, first ask to write plans using the `superpowers:writing-plans` skill.
