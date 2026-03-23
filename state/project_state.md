# Project State
Last updated: 2026-03-23T07:09:12Z
Updated by: evolve.yml (self-evolution run)

## Last Session
Action: evolve.yml — self-evolution run. 12 research sources + trending + OpenAI blog checked. 4 source changes (gstack v0.9.9.1 cross-model outside voice, everything-claude-code Kiro steering, Astro RSS CVE fix, VoltAgent Rails version-aware) — none actionable for single-model scaffold. 1 new pipeline failure (Weekly Analysis 06:26, stale branch — already covered by #59). All conditional steps skipped (hour 07). 0 issues created.

System health:
- Reviewer Agent: HEALTHY — succeeded at 06:06
- Evolve: FIX DEPLOYED — lightweight mode gate (commit ce1994c) on main; monitoring next runs
- Weekly Analysis: FAILING — stale branch collision (issue #59 open)
- Feedback Learner: IDLE (no merged PRs to process — expected)
- Watcher: OVERUTILIZED (4/6 post-30 exceed max-turns=30, 66.7%)
- Coder: HEALTHY (avg 87.5%/40)
- All other workflows: healthy

## Current Priorities (ordered)
1. **[PR]** PR #55: fix reviewer.yml state reset — APPROVED, awaiting human merge (7h+)
2. **[ISSUE]** Issue #59: analyze.yml stale branch name collision — needs triage+fix
3. **[ISSUE]** Issue #53: Reviewer README sync conflict — covered by PR #55
4. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
5. **[WAITING]** Issue #22: Submit to awesome-claude-code — 7-day cooldown expires ~March 28

## Open Items
1. PR #55: fix(workflow) reviewer.yml state reset — APPROVED, needs human merge
2. Issue #59: [pipeline-fix] analyze.yml stale branch collision — new, needs fix
3. Issue #53: [pipeline-fix] Reviewer Agent README sync — covered by PR #55
4. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents — needs-human
5. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28

## Week 2 Key Metrics
- Commits: 300+ (advancing with state commits)
- Features shipped: 21
- Issues created: ~32 | Issues closed: ~27
- Workflow runs: ~200+ (evolve dominant)
- Research sources monitored: 12 + trending
- Stars: 1 | Forks: 0 | Adopters: 0

## Closed Items (recent)
- Issue #57: CLOSED by watcher (fix confirmed on main — commit ce1994c, PR #58 redundant)
- PR #58: CLOSED by reviewer (fix already on main, redundant)
- PR #56: CLOSED by reviewer (merge conflicts with state files)
- Issue #51: CLOSED by watcher (PR #54 merged, max-turns raised)

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- "Commit state changes via API" step now also commits untracked state files
- Evolve lightweight mode gate now deployed (commit ce1994c) — skips Steps 2b-2h when sources unchanged 2+ consecutive runs
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (issue #53, PR #55 APPROVED)
- PR #55 approved by reviewer — human merge needed for workflow YAML change
- analyze.yml has stale branch bug: date-based branch name collides on same-day re-runs (issue #59)
- Watcher overutilized (66.7% exceed max-turns=30) — trending worse, monitor
- Feedback Learner idle since 17:29 — no merged PRs to trigger it, expected
