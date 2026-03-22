# Project State
Last updated: 2026-03-22T20:45:00Z
Updated by: watcher.yml (health check)

## Last Session
Action: watcher.yml — health check. PR #50 (analyze.yml fix) was CLOSED by reviewer, not merged. Re-triggered triage for #47 to get a new fix approach. System stable but evolve saturation worsening.

System health:
- Weekly Analysis (analyze.yml): fix PR #50 REJECTED — #47 still open, re-triaged
- Evolve: SEVERELY SATURATED (11/12 = 91.7% exceed max-turns=30) — issue #51 open, WORSENING
- Watcher: IMPROVING (3/8 = 37.5% exceed max-turns=25) — issue #51 covers this
- Feedback Learner: RECOVERED (last fail 13:41, no failures since)
- Coder: HEALTHY (0/2 exceed 40, avg 36/40)
- All other workflows: healthy

## Current Priorities (ordered)
1. **[ISSUE]** Issue #47: Weekly Analysis clean-tree fix — PR #50 rejected, re-triaging for new approach
2. **[ISSUE]** Issue #51: Evolve max-turns 91.7% saturated (worsening) — needs max-turns increase urgently
3. **[WAITING]** Issue #22: Submit to awesome-claude-code — 7-day repo age cooldown expires ~March 28
4. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
5. **[STALLED]** Profile page FEATURE_STATUS: 4/6 sections unchecked despite landing redesign
6. **[CLEANUP]** Prune inactive research sources (godagoo 7+ weeks, humanlayer 2+ months)

## Open Items
1. Issue #47: [pipeline-fix] Weekly Analysis clean-tree — PR #50 rejected, re-triaged
2. Issue #51: [pipeline-fix] Evolve max-turns saturation (91.7%, worsening each run)
3. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28
4. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents — needs owner action
5. Profile page sections: live stats, evolution timeline, capabilities inventory, architecture diagram

## Week 2 Key Metrics
- Commits: 220+ (up from 64 at Week 1 midpoint)
- Features shipped: 21
- Issues created: ~25 | Issues closed: ~20
- Workflow runs: ~100+ (evolve dominant at ~20 runs)
- Research sources monitored: 12 + trending
- Stars: 1 | Forks: 0 | Adopters: 0

## Closed Items (recent)
- PR #50 (analyze.yml clean-tree fix): CLOSED by reviewer (not merged)
- PRs #19 (anti-sycophancy) + #20 (agentic security): CLOSED by owner (not merged)
- Weekly Analysis 3x failure: RESOLVED (succeeded at 18:07, but fix PR rejected)

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- "Commit state changes via API" step now also commits untracked state files
- Incremental evolve (PR #46) merged — has NOT reduced max-turns saturation (91.7% and rising)
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
