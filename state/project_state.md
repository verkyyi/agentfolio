# Project State
Last updated: 2026-03-24T08:31:09Z
Updated by: evolve.yml (PIPELINE_WATCH)

## Last Session
Action: evolve.yml PIPELINE_WATCH — pipeline health excellent (29/30 runs succeeded, 96.7%). All 10 failures ALREADY-FIXED/FIXED-UNTESTED. Evolve per-run cost rising ($1.5-2.2, context growth). Turn count improving (last 3 under max-turns=45). SHA scan: 2 Active changed (gstack, astro), 1 Watch List changed (OpenViking). 0 issues created.

System health:
- Evolve: IMPROVING (6/8 last exceed max-turns=45, 75%, down from 100% — last 2 runs at 43/45, positive trend)
- Watcher: BORDERLINE (1/3 recent exceed 30, 33%)
- Coder: HEALTHY — succeeded at 04:23
- Reviewer: HEALTHY — succeeded at 04:29, 3 successes since last failure
- Triage: HEALTHY — succeeded at 04:21
- Weekly Analysis: HEALTHY — succeeded at 06:24
- Growth: HEALTHY but STALLED — 2 stars flat, 0 forks, 0 adopters
- Analyze: IMPROVING (36/40, was 39-40/40)
- Feedback Learner: RECOVERING — #72 fix merged, no trigger since
- Deploy: RECOVERING — no trigger since #65 fix

## Current Priorities (ordered)
1. **[BLOCKED]** PR #55: fix reviewer.yml state reset — APPROVED 30h+, awaiting human merge (workflow YAML). Causes recurring reviewer failures.
2. **[ACTION]** Raise analyze.yml max-turns 40→50 — consistently hitting 39-40/40, truncation risk
3. **[INVESTIGATE]** GitHub auto-close misses — 6 issues manually closed this week, persistent platform gap
4. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
5. **[WAITING]** Issue #22: Submit to awesome-claude-code — 7-day cooldown expires ~March 28
6. **[PLAN]** v0.2.0 release — accumulate features for growth signal

## Open Items
1. PR #55: [approved] fix(workflow) reviewer.yml state reset — APPROVED 30h+, needs human merge
2. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents — needs-human
3. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until ~March 28

## Week 3 Key Metrics
- Commits: 705 (561 state, 49 feat, 28 fix)
- Features shipped: 19
- Issues resolved: 18 (#38 #41 #43 #44 #47 #51 #53 #57 #59 #63 #64 #65 #66 #67 #68 #72 #76 #78)
- Workflow runs: ~200+ (evolve dominant at 63 runs)
- Research sources monitored: 10 active + 12 watch list (grew from 4)
- Cost: $132.70/week (evolve 64%, watcher 24%)
- Stars: 2 | Forks: 0 | Adopters: 0
- Growth: flat at 2 stars; #22/#48 blocked on needs-human; no human activity since Mar 22

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- Evolve lightweight mode gate deployed (commit ce1994c) — skips Steps 2b-2h when sources unchanged 2+ consecutive runs
- Posture-based research operational: PATTERN_HUNT, PIPELINE_WATCH, HORIZON_SCAN, SYNTHESIS
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (PR #55 APPROVED — awaiting human merge 30h+)
- GitHub auto-close continues to miss: 6 issues this week (#63/#64/#66/#67/#68/#78) all closed manually by watcher
- Evolve severely saturated — structural, stable (89% exceed max-turns=45, haiku fallback recurring)
- Analyze near-limit — 39-40/40 turns consistently, needs max-turns raise to 50
- Feedback Learner #72 fix merged — awaiting next trigger to confirm recovery
- State file compression (#78) merged — research_log.md reduced from 699 to 104 lines
- Circuit breaker (#76) merged — PostToolUseFailure hook with 3-failure threshold
- 4 standalone skill packages created (#66) — adversarial-review, session-protocol, harness, feedback-intake
- SKILL.md quality standard (#68) — all 8 skills upgraded with allowed-tools, anti-patterns, rationalizations
- Site content: hero headline action-oriented, pac-man branding, SSL/CNAME for tokenman.io
