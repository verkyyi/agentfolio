# Project State
Last updated: 2026-03-24T04:20:00Z
Updated by: watcher.yml

## Last Session
Action: watcher.yml health check — 3 corrective actions: closed #72 and #76 (PRs #79/#80 merged, GitHub auto-close missed — 4th occurrence of recurring pattern), re-triggered triage for #78 (>2h, 0 comments). Pipeline fully operational. Full evolve→triage→coder→reviewer→merge cycle completed for #72 and #76 since last watcher run.

System health:
- Evolve: SEVERELY SATURATED (structural, 9/10 last exceed max-turns=45, 90%, stable)
- Watcher: NORMALIZED (healthy, 1/10 exceed 30)
- Coder: HEALTHY — succeeded at 03:29
- Reviewer: HEALTHY — succeeded at 03:34 (failure at 02:23 = same #53 bug, recovered)
- Triage: HEALTHY — succeeded at 03:28
- Weekly Analysis: HEALTHY — succeeded at 00:19
- Growth: HEALTHY — succeeded at 18:16
- Analyze: HEALTHY — succeeded at 00:24 (NEAR-LIMIT: 39-40/40 turns)
- Feedback Learner: RECOVERING — fix PR #79 merged at 03:35, no run since to verify
- Deploy: RECOVERING — no run since #65 fix (no site-content push since)

## Current Priorities (ordered)
1. **[PR]** PR #55: fix reviewer.yml state reset — APPROVED 28h+, awaiting human merge (workflow YAML)
2. **[TRIAGE]** Issue #78: State file compression — evolve-finding, >2h, triage re-triggered
3. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
4. **[WAITING]** Issue #22: Submit to awesome-claude-code — 7-day cooldown expires ~March 28

## Open Items
1. PR #55: [approved] fix(workflow) reviewer.yml state reset — APPROVED 28h+, needs human merge
2. Issue #78: [evolve-finding] state file compression — triage re-triggered by watcher
3. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents — needs-human
4. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28
5. Issue #72: CLOSED by watcher (PR #79 merged)
6. Issue #76: CLOSED by watcher (PR #80 merged)

## Week 2 Key Metrics
- Commits: 300+ (advancing with state commits)
- Features shipped: 21
- Issues created: ~32 | Issues closed: ~30
- Workflow runs: ~200+ (evolve dominant)
- Research sources monitored: 10 active + 10 watch list
- Stars: 2 | Forks: 0 | Adopters: 0
- Growth: +1 star since v0.1.0 release (now flat at 2); discussion #49 has 0 engagement after 39h; distribution issues #22/#48 blocked on needs-human; no action taken — next action when features accumulate for v0.2.0

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- "Commit state changes via API" step now also commits untracked state files
- Evolve lightweight mode gate now deployed (commit ce1994c) — skips Steps 2b-2h when sources unchanged 2+ consecutive runs
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (issue #53 closed, PR #55 APPROVED — awaiting human merge)
- PR #55 approved by reviewer — human merge needed for workflow YAML change (24h+ pending)
- analyze.yml stale branch bug fixed (issue #59 closed, fix deployed — Weekly Analysis succeeded at 18:16, fully confirmed)
- #63 and #64 fully processed: evolve→triage→coder→PR→reviewer→merge. Closed by watcher (GitHub auto-close missed).
- #66, #67, #68 fully processed: evolve→triage→coder→PR→reviewer→merge. Closed by watcher (GitHub auto-close missed again — recurring pattern).
- #72 and #76 fully processed: evolve→triage→coder→PR→reviewer→merge. Closed by watcher (4th occurrence of auto-close miss).
- Evolve severely saturated — structural, stable (90% exceed max-turns)
- Watcher NORMALIZED — healthy (1/10 exceed 30 turns)
- Feedback Learner RECOVERING — fix PR #79 merged, awaiting next run to verify
- Analyze NEAR-LIMIT — 39-40 of 40 max turns
- Site content updated: hero headline now action-oriented, pac-man branding, broken logo removed, SSL/CNAME for tokenman.io
- README minor inaccuracy: says "10 external sources across rotating tiers" — actually 12 sources, all checked every run (no rotation). Not issueworthy given existing #38 coverage.
