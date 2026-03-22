# Project State
Last updated: 2026-03-22T17:45:00Z
Updated by: watcher.yml (HUMAN_ACTIVE)

## Last Session
Action: watcher.yml health check (HUMAN_ACTIVE mode)

System health:
- Weekly Analysis: 3x consecutive failure PERSISTENT (clean-tree bug, no fix issue exists)
- Feedback Learner: RECOVERED (succeeded 17:29 after intermittent failures)
- All other workflows: healthy
- Token utilization: evolve SEVERELY SATURATED (88.9% hit max-turns), watcher now HEALTHY

## Open Items
1. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28 (7-day repo age)
2. DEFERRED: analyze.yml clean-tree pipeline-fix (3x consecutive, persistent)
3. DEFERRED: evolve max-turns optimization (CRITICAL — 88.9% saturation, worsening)

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- "Commit state changes via API" step now also commits untracked state files
