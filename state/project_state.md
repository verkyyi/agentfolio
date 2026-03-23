# Project State
Last updated: 2026-03-23T21:28:05Z
Updated by: evolve.yml (HORIZON_SCAN posture)

## Last Session
Action: evolve.yml — HORIZON_SCAN (staleness override, 9 runs since last). Searched 4 query sets, evaluated 40+ repos in the claude code agent ecosystem. Added 4 new Watch List entries: claude-mem (39K stars, session memory compression), vibe-kanban (24K, PR-issue linking), trailofbits/skills (4K, security audit skills), antigravity-awesome-skills (27K, 1304+ skill catalog). All 10 Active SHAs unchanged. 0 forks/adopters. 0 issues created — Watch List feeding run.

System health:
- Evolve: SEVERELY SATURATED (structural, stable, 91%+ exceed max-turns)
- Watcher: NORMALIZED (healthy)
- Weekly Analysis: HEALTHY — succeeded at 18:16
- Reviewer Agent: HEALTHY — succeeded at 06:06
- Feedback Learner: HEALTHY/IDLE — succeeded at 07:38
- Coder: HEALTHY (33/40 avg, 83%)
- Deploy: RECOVERING — 2 failures at 20:29+20:44 (e2e config fix applied, awaiting next run)
- Growth: HEALTHY — succeeded at 18:16
- Analyze: HEALTHY — succeeded at 18:23
- All other workflows: healthy

## Current Priorities (ordered)
1. **[PR]** PR #55: fix reviewer.yml state reset — APPROVED 20h+, awaiting human merge (workflow YAML)
2. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
3. **[WAITING]** Issue #22: Submit to awesome-claude-code — 7-day cooldown expires ~March 28

## Open Items
1. PR #55: fix(workflow) reviewer.yml state reset — APPROVED, needs human merge
2. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents — needs-human
3. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28

## Week 2 Key Metrics
- Commits: 300+ (advancing with state commits)
- Features shipped: 21
- Issues created: ~32 | Issues closed: ~30
- Workflow runs: ~200+ (evolve dominant)
- Research sources monitored: 12 + trending
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
- PR #55 approved by reviewer — human merge needed for workflow YAML change (20h+ pending)
- analyze.yml stale branch bug fixed (issue #59 closed, fix deployed — Weekly Analysis succeeded at 18:16, fully confirmed)
- Evolve severely saturated — structural, stable
- Watcher NORMALIZED — healthy
- Feedback Learner healthy — succeeded 07:38, idle when no merged PRs (expected)
- Site content updated: hero headline now action-oriented, pac-man branding, broken logo removed, SSL/CNAME for tokenman.io
- README minor inaccuracy: says "10 external sources across rotating tiers" — actually 12 sources, all checked every run (no rotation). Not issueworthy given existing #38 coverage.
