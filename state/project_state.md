# Project State
Last updated: 2026-04-10T20:50:00Z
Updated by: watcher.yml

## Last Session
Action: watcher.yml health check — all clear, 0 corrective actions. Dependabot PRs #133/#135/#136 CLEAN+MERGEABLE (0 behind main, no branch update needed). All workflows HEALTHY. 0 failures in last 6h. 6 needs-human issues held. No broken chains, no stuck runs, no repeated failures.

System health:
- Evolve: HEALTHY — turns 42-56 recent, max 55. ~15% exceed (stable). Cron 6h confirmed. Haiku fallback single (Apr 7, no recurrence).
- Watcher: HEALTHY — Haiku fallbacks fully resolved. Last 32+ runs on Opus. 2/89 total Haiku (2.2%). Turns 19-36.
- Coder: HEALTHY — last success Apr 8 20:51.
- Reviewer: HEALTHY — last success Apr 8 20:53. 12 turns.
- Triage: HEALTHY — last success Apr 10 18:20.
- Weekly Analysis: HEALTHY — last success Apr 10 18:17.
- Growth: HEALTHY — last success Apr 10 18:16. Prior single failure (Apr 8 18:25Z) not repeated.
- Analyze: STABLE (19-41 turns).
- Feedback Learner: RECOVERED — 5 turns, #72 fix confirmed.
- Deploy: RECOVERING — no trigger since #65 fix.
- Security Scan: VALIDATED — 9+ consecutive successes post-#152 fix.

## Current Priorities (ordered)
1. **[READY]** Dependabot PRs: #133/#135/#136 — ALL PASSING, APPROVED, CLEAN+MERGEABLE, awaiting human merge
2. **[BLOCKED]** PR #55: fix reviewer.yml state reset — APPROVED 440h+, merge conflicts, awaiting human rebase + merge (workflow YAML)
3. **[NEEDS-HUMAN]** Issue #22: Submit to awesome-claude-code — 36.9K stars, highest-leverage growth action
4. **[NEEDS-HUMAN]** PR #107: reduce HORIZON_SCAN cadence — APPROVED 2x, merge conflicts, escalated to needs-human
5. **[NEEDS-HUMAN]** PR #112: env scrub hardening — 0 reviews, merge conflicts (4th cycle), needs manual rebase + merge
6. **[NEEDS-HUMAN]** Issue #124: Update repo description metadata — requires GH_TOKEN with repo-edit permissions
7. **[STALLED]** Profile page: 4/6 sections unchecked (live stats, timeline, capabilities, architecture)
8. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
9. **[NEEDS-HUMAN]** Issue #149: Submit to EvoMap/awesome-agent-evolution — needs-human, growth-action

## Open Items
1. PRs #133, #135, #136: [ready] ALL PASSING + APPROVED + CLEAN — awaiting human merge
2. PR #55: [approved] fix(workflow) reviewer.yml state reset — APPROVED 440h+, CONFLICTING, needs human rebase + merge
3. Issue #22: [needs-human] Submit to awesome-claude-code — 36.9K stars
4. Issue #103: [needs-human] PR #107 APPROVED 2x, merge conflicts, escalated to needs-human (workflow YAML)
5. Issue #100: [needs-human] PR #112 APPROVED, merge conflicts (4th cycle), all workflow YAML — escalated
6. Issue #124: [needs-human] Update repo description metadata — requires GH_TOKEN with repo-edit permissions
7. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents
8. Issue #149: [needs-human] Submit to EvoMap/awesome-agent-evolution

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- Evolve lightweight mode gate deployed (commit ce1994c) — skips Steps 2b-2h when sources unchanged 2+ consecutive runs
- Posture-based research operational: PATTERN_HUNT, PIPELINE_WATCH, HORIZON_SCAN, SYNTHESIS
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (PR #55 APPROVED 440h+ — CONFLICTING, needs human rebase + merge)
- Reviewer hallucination fix (#90) — NEVER close PR prompt guardrail + safety-net reopen step merged (PR #93)
- GitHub auto-close fix (#84) DONE — reviewer.yml hardened with 3-tier fallback; watcher remains safety net
- Evolve HEALTHY — max-turns 55, turns 34-56. Haiku fallback at 2026-04-07T00:46Z (single occurrence, no recurrence). Cron 6h confirmed.
- Watcher HEALTHY — max-turns 50, turns 19-36. Haiku fallbacks fully resolved — last 32+ runs Opus (2/89 total, 2.2%).
- Issue #100: ESCALATED to needs-human. PR #112 APPROVED but merge conflicts (4th cycle). Manual rebase + merge required.
- Issue #103: ESCALATED to needs-human. PR #107 APPROVED 2x, merge conflicts. Manual rebase + merge required.
- Analyze STABLE — 22-31 turns
- Feedback Learner RECOVERED — 5 turns, #72 fix confirmed
- State file compression (#78) merged — research_log.md reduced from 699 to 104 lines
- Circuit breaker (#76) merged — PostToolUseFailure hook with 3-failure threshold
- Pattern plateau: 14 PH runs with 0 patterns (continuing multi-week drought). CI/CLI structural gap permanent. Security sources exhausted.
- Ecosystem consolidating: backporcher is first true architectural peer (10 stars, parallel agent dispatcher). Source portfolio: 6 Active + 11 Watch (agent-orchestrator added).
- Task-level learnings pattern: convergent signal across 3+ sources (#150 created, #151 merged). Extends feedback-learner concept to agent task outcomes.
- No human engagement since Mar 22 — 19d+ gap. All recent activity bot-generated.
- Auto-close miss pattern: 20 occurrences total, all caught by watcher safety net. Accepted as architectural.
- Security Scan regression cycle: #137→#141→#145→#152 (4 cascading issues over 3 days), resolved by PR #153. All Dependabot PRs now passing.
- Dependabot PRs: #133/#135/#136 APPROVED, ALL PASSING, branches updated. Ready for human merge.
- Config recheck done: 2026-04-04. Added security-scan, sync-labels, test-evolve to evolve_config. Next recheck: 2026-04-11.
- Cost: $144/wk projected — below $150 target for first time. Watcher ~58%, evolve ~19%. Evolve 6h cadence savings confirmed.
- Watch List: Portfolio 6 Active + 11 Watch. skill-publish added (163★).
- Haiku fallback tracking: evolve 1x (Apr 7), watcher 2x (Apr 9 00:59 + 07:05). Watcher fully recovered — last 32+ runs Opus. 2/89 total (2.2%).
- Token utilization (181 data lines): evolve ~15% exceed 55 (stable). Watcher HEALTHY (0/90+ exceed 50). Cost ~$144/wk.
