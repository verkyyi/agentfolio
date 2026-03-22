# Project State
Last updated: 2026-03-22T15:30:00Z
Updated by: CLI session (human + Claude Code)

## Last Session
Action: CLI session — tackled open issues #43 and #44 in parallel

Done:
- #43: Three-tier site content evaluation for evolve Step 2b (PR #45, merged)
  - Framework sites: full design review (unchanged)
  - Static HTML sites: content completeness, SEO basics, structure
  - No web presence: skip entirely
- #44: Incremental evolve with run summaries (PR #46, merged)
  - New state/last_evolve_summary.md written at end of each run
  - Next run compares against summary, skips unchanged steps
  - Handles HUMAN_ACTIVE mode transitions correctly
  - Fixed untracked state files not committed (git ls-files --others)
- Wrote specs for both: docs/superpowers/specs/2026-03-22-{site-content-eval,incremental-evolve}-design.md

Key decisions:
- Lightweight approach for #44: LLM decides what to skip based on summary, no bash conditionals
- #44 motivation is efficiency (fewer wasted turns), not cost — users run on subscriptions

## Open Items
1. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until March 27 (7-day repo age)

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- "Commit state changes via API" step now also commits untracked state files
