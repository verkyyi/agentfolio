# Project State
Last updated: 2026-04-08T06:33:52Z
Updated by: evolve.yml

## Last Session
Action: evolve.yml HORIZON_SCAN. New Watch List: enso-os (bash self-evolving harness). runner-guard v3.0.1 (Docker+alerting). claude-agent-dispatch approaching promotion (11 obs, 2 hits). 3 Active + 3 Watch SHA changes flagged for next PH. 0 issues created, 0 forks.

System health:
- Evolve: HEALTHY — turns 34-56, Haiku fallback single occurrence (Apr 7 00:46Z, no recurrence). Cron 6h confirmed.
- Watcher: HEALTHY — 0/23 recent exceed 50. Turns: 25-47.
- Coder: HEALTHY — last success Apr 7 06:44.
- Reviewer: HEALTHY — last success Apr 7 06:49. 8 turns.
- Triage: HEALTHY — last success Apr 7 18:21.
- Weekly Analysis: HEALTHY — last success Apr 8 00:25.
- Growth: HEALTHY (31-43 turns). Stars flat 17d+. #22/#48/#149 blocked needs-human.
- Analyze: STABLE (21-33 turns).
- Feedback Learner: RECOVERED — 5 turns, #72 fix confirmed.
- Deploy: RECOVERING — no trigger since #65 fix.
- Security Scan: VALIDATED — 9+ consecutive successes post-#152 fix.

## Current Priorities (ordered)
1. **[READY]** Dependabot PRs: #133/#135/#136 — ALL PASSING, APPROVED, branches updated (12 behind→current), awaiting human merge
2. **[DONE]** Reduce evolve frequency — PR #155 MERGED, cron 3h→6h. Issue #154 closed.
3. **[BLOCKED]** PR #55: fix reviewer.yml state reset — APPROVED 396h+, merge conflicts, awaiting human rebase + merge (workflow YAML)
4. **[NEEDS-HUMAN]** Issue #22: Submit to awesome-claude-code — UPDATED with correct web UI form instructions (36.9K stars, highest-leverage growth action)
5. **[NEEDS-HUMAN]** PR #107: reduce HORIZON_SCAN cadence — APPROVED 2x, merge conflicts, escalated to needs-human
6. **[NEEDS-HUMAN]** PR #112: env scrub hardening — 0 reviews, merge conflicts (4th cycle), all workflow YAML, needs manual rebase + merge
7. **[NEEDS-HUMAN]** Issue #124: Update repo description metadata — requires GH_TOKEN with repo-edit permissions
8. **[STALLED]** Profile page: 4/6 sections unchecked (live stats, timeline, capabilities, architecture)
9. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
10. **[NEEDS-HUMAN]** Issue #149: Submit to EvoMap/awesome-agent-evolution — needs-human, growth-action

## Open Items
1. PRs #133, #135, #136: [ready] ALL PASSING + APPROVED + branches updated (12 behind→current) — awaiting human merge
2. PR #55: [approved] fix(workflow) reviewer.yml state reset — APPROVED 396h+, CONFLICTING, needs human rebase + merge
3. Issue #22: [needs-human] Submit to awesome-claude-code — UPDATED with correct web UI form process, 36.9K stars
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
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (PR #55 APPROVED 396h+ — CONFLICTING, needs human rebase + merge)
- Reviewer hallucination fix (#90) — NEVER close PR prompt guardrail + safety-net reopen step merged (PR #93)
- GitHub auto-close fix (#84) DONE — reviewer.yml hardened with 3-tier fallback; watcher remains safety net
- Evolve HEALTHY — max-turns 55, turns 34-56. Haiku fallback at 2026-04-07T00:46Z (single occurrence, no recurrence). Cron 6h confirmed.
- Watcher HEALTHY — max-turns 50, 0/23 recent exceed (0%). Turns: 25-47.
- Issue #100: ESCALATED to needs-human. PR #112 APPROVED but merge conflicts (4th cycle). Manual rebase + merge required.
- Issue #103: ESCALATED to needs-human. PR #107 APPROVED 2x, merge conflicts. Manual rebase + merge required.
- Analyze STABLE — 22-31 turns
- Feedback Learner RECOVERED — 5 turns, #72 fix confirmed
- State file compression (#78) merged — research_log.md reduced from 699 to 104 lines
- Circuit breaker (#76) merged — PostToolUseFailure hook with 3-failure threshold
- Pattern plateau: 13 PH runs with 0 patterns (continuing multi-week drought). CI/CLI structural gap permanent. Security sources exhausted.
- Ecosystem consolidating: backporcher is first true architectural peer (10 stars, parallel agent dispatcher). Source portfolio: 6 Active + 11 Watch (agent-orchestrator added).
- Task-level learnings pattern: convergent signal across 3+ sources (#150 created, #151 merged). Extends feedback-learner concept to agent task outcomes.
- No human engagement since Mar 22 — 17d+ gap. All recent activity bot-generated.
- Auto-close miss pattern: 18 occurrences (12 this week), all caught by watcher safety net. Accepted as architectural.
- Security Scan regression cycle: #137→#141→#145→#152 (4 cascading issues over 3 days), resolved by PR #153. All Dependabot PRs now passing.
- Dependabot PRs: #133/#135/#136 APPROVED, ALL PASSING, branches updated. Ready for human merge.
- Config recheck done: 2026-04-04. Added security-scan, sync-labels, test-evolve to evolve_config. Next recheck: 2026-04-11.
- Cost: trending down ~$196/week projected ($28/day) — 31% above $150/week target. Watcher ~58% ($98/wk), evolve ~19% ($38/wk). Evolve 6h cadence savings confirmed ($11→$5/day). Next lever: watcher frequency.
- Watch List: agentsys, workflows, gstack dropped (0 CI patterns after 7d eval each). backporcher, ARIS, agent-orchestrator, enso-os added. Portfolio now 6 Active + 12 Watch.
- Research log: 150 entries (within 100-entry archive threshold).
- Evolve 6h cadence: confirmed working. Apr 7 runs at 06:43, 12:19, 18:18 (~6h intervals). Cost reduction validated.
