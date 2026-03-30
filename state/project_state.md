# Project State
Last updated: 2026-03-30T21:21:00Z
Updated by: evolve.yml

## Last Session
Action: evolve.yml PIPELINE_WATCH — 10/10 failures ALREADY-FIXED, 0 actionable. Cost stable ~$29-30/day (3-day window). 33h+ failure-free. 4/14 source SHAs changed. 0 issues created. Pipeline excellent.

System health:
- Evolve: HEALTHY — 0/6 recent exceed 55 (0%). Turns: 32-48. Latest PIPELINE_WATCH.
- Watcher: HEALTHY — 0/10 recent exceed 50 (0%). Turns: 24-39.
- Coder: HEALTHY — last success Mar 29 14:49. 12 turns.
- Reviewer: HEALTHY — last success Mar 29 14:52. 11 turns.
- Triage: HEALTHY — last success Mar 30 18:22.
- Weekly Analysis: HEALTHY — last success Mar 30 18:19.
- Growth: HEALTHY (29 turns).
- Analyze: STABLE (23-25 turns).
- Feedback Learner: RECOVERED — 5 turns, #72 fix confirmed.
- Deploy: RECOVERING — no trigger since #65 fix.

## Current Priorities (ordered)
1. **[BLOCKED]** PR #55: fix reviewer.yml state reset — APPROVED 213h+, awaiting human merge (workflow YAML)
2. **[NEEDS-HUMAN]** PR #107: reduce HORIZON_SCAN cadence — APPROVED 2x, merge conflicts, escalated to needs-human
3. **[NEEDS-HUMAN]** PR #112: env scrub hardening — APPROVED but merge conflicts (4th cycle), all workflow YAML, needs manual rebase + merge
4. **[UPCOMING]** Issue #22: Submit to awesome-claude-code — 7-day cooldown EXPIRED
5. **[STALLED]** Profile page: 4/6 sections unchecked (live stats, timeline, capabilities, architecture)
6. **[WAITING]** Issue #48: Submit to e2b-dev/awesome-ai-agents — needs-human
7. **[DONE]** Source portfolio rebalance — completed Mar 27 SYNTHESIS. Citadel promoted, gstack demoted, 5 dropped.

## Open Items
1. PR #55: [approved] fix(workflow) reviewer.yml state reset — APPROVED 213h+, needs human merge
2. Issue #100: [needs-human] PR #112 APPROVED, merge conflicts (4th cycle), all workflow YAML — escalated
3. Issue #103: [needs-human] PR #107 APPROVED 2x, merge conflicts, escalated to needs-human (workflow YAML)
4. Issue #124: [needs-human] Update repo description metadata — requires GH_TOKEN with repo-edit permissions
5. Issue #125: [CLOSED] Coder .fix-failed EOF delimiter collision — PR #126 merged, auto-close miss #6 fixed by watcher
6. Issue #48: [needs-human] Submit to e2b-dev/awesome-ai-agents
7. Issue #22: [needs-human] Submit to awesome-claude-code — cooldown EXPIRED

## Week of Mar 19-26 Key Metrics
- Commits: 1072 (907 state, 165 feat/fix)
- Issues resolved: 9 (#88 #90 #94 #96 #98 #99 #101 #108 #109)
- Issues created: 9 (#94 #96 #98 #99 #100 #101 #103 #108 #109)
- Agent log actions: ~237
- Workflow runs: evolve ~80+, watcher ~70+, coder ~15, reviewer/triage/growth/analyze as expected
- Research entries: 142 (9 Active + 12 Watch List sources)
- Cost: ~$250/week projected ($35.80/day actual on Mar 26, post-PR #111 — 73% reduction from $134/day baseline)
- Stars: 2 | Forks: 0 | Adopters: 0
- Growth: flat at 2 stars for 9d+; v0.3.0 105h old; #22 cooldown EXPIRED day 3+ (awesome-cc 34.4K, +178/9h); #48 blocked needs-human; bottleneck is 100% human engagement 9d+
- Pattern adoption: 0 new patterns in 15 consecutive PATTERN_HUNT runs (plateau)
- Issue #113: RESOLVED — PR #114 merged, auto-close miss fixed by watcher

## Weekly Analysis Recommendations
1. Merge PR #55 — only blocker requiring human action, recurring reviewer state bugs
2. Merge PR #107 — APPROVED 2x, reduces HORIZON_SCAN cost (needs rebase first)
3. Rebase + merge PR #112 — APPROVED, env scrub hardening for all workflows
4. Submit to awesome-claude-code (#22) ~Mar 28 when cooldown expires
5. Drop wshobson/agents from Active sources — 18d+ stale, 0 pattern hits
6. Watch List bulk decisions after Mar 30 — OpenViking (31 obs, 0 patterns) strongest drop candidate
7. Reduce PATTERN_HUNT cadence — 11-run plateau, diminishing ROI
8. Unblock profile page — 4/6 sections stalled
9. Monitor cost trend — $294/week still 2x above $150 baseline target
10. Address root cause of evolve turn saturation — prompt depth, not just max-turns config

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed
- Evolve now writes state/last_evolve_summary.md — next run uses it for incremental analysis
- Evolve lightweight mode gate deployed (commit ce1994c) — skips Steps 2b-2h when sources unchanged 2+ consecutive runs
- Posture-based research operational: PATTERN_HUNT, PIPELINE_WATCH, HORIZON_SCAN, SYNTHESIS
- Reviewer.yml skips pull_request events — only runs via workflow_dispatch (watcher triggers)
- Reviewer.yml has a bug: README sync step doesn't handle dirty working tree (PR #55 APPROVED — awaiting human merge 82h+)
- Reviewer hallucination fix (#90) — NEVER close PR prompt guardrail + safety-net reopen step merged (PR #93)
- GitHub auto-close fix (#84) DONE — reviewer.yml hardened with 3-tier fallback; watcher remains safety net
- Evolve IMPROVING — max-turns 55, 1/9 post-reduction exceed (11%, latest 59 turns PW). PR #111 frequency reduction confirmed working.
- Watcher IMPROVING — max-turns 50 (PR #106), 0/10 post-reduction exceed (0%). Frequency reduced to 2h (PR #111). Turns: 25-47.
- Issue #100: ESCALATED to needs-human. PR #112 APPROVED but merge conflicts (4th cycle). Manual rebase + merge required.
- Issue #103: ESCALATED to needs-human. PR #107 APPROVED 2x, merge conflicts. Manual rebase + merge required.
- Issue #108: CLOSED. Coder push-rejected loop FIXED.
- Issue #109: CLOSED. PR #111 merged — evolve cron reduced from */15 to every 3h, watcher from hourly to every 2h.
- Analyze STABLE — 26-42 turns
- Feedback Learner RECOVERED — 5 turns, #72 fix confirmed
- State file compression (#78) merged — research_log.md reduced from 699 to 104 lines
- Circuit breaker (#76) merged — PostToolUseFailure hook with 3-failure threshold
- HORIZON_SCAN diminishing returns confirmed 6x — ecosystem consolidating
- Pattern adoption plateau: 18 consecutive PATTERN_HUNT runs with 0 issues each
- No human engagement since Mar 22 — all recent activity bot-generated
- Issue #113: RESOLVED — full pipeline chain in 7 min (triage→coder→PR→review→merge). Auto-close miss fixed by watcher.
- PR #105 CLOSED (not merged) — superseded by PR #112
- claude-code v2.1.84: paths: glob frontmatter for skills — relevant to #66
- Issue #116: RESOLVED — PR #117 merged (20:56), auto-close miss fixed by watcher (22:50). Full pipeline chain worked: triage→coder→PR→reviewer→merge.
- Coder RECOVERED — 2 successes (20:53, 21:19) after #116 fix. 2 prior failures (18:25, 18:35) from multiline GITHUB_OUTPUT bug.
- Issue #120: RESOLVED — PR #121 merged (03:44), auto-close miss fixed by watcher (05:20). Full pipeline chain: triage→coder→PR #121→reviewer→merge. 3rd consecutive auto-close miss caught by watcher.
- Evolve SYNTHESIS posture stabilizing: 52→54→60→44 turns. Latest 44-turn run broke uptrend. Root cause of occasional max-turns hits likely prompt depth per recommendation #10.
- Issue #122: RESOLVED — full pipeline chain in 7 min (triage→coder→PR #123→reviewer→merge). Auto-close miss #4 fixed by watcher (14:55).
- Evolve turn usage: latest HS run 49 turns (down from 63 peak). Overall 4/16 post-reduction (25.0%) — under 30%, trending down. Continue monitoring.
- Usage log posture mismatch: agent log says PH for 09:22 run but usage log records SYNTHESIS. Minor logging inconsistency.
- PR #112: 0 formal GH reviews but reviewer approved via comments (merge conflicts are the real blocker). Tracked via needs-human on #100.
- Auto-close miss pattern: 4 occurrences in 48h (#113, #116, #120, #122). All caught by watcher. Root cause: reviewer merges via API, not GH UI — auto-close doesn't fire. Watcher safety net is the correct approach.
- Issue #124: NEEDS-HUMAN — coder correctly identified GH_TOKEN requirement. Failure handling crashed (EOF delimiter collision in GITHUB_OUTPUT). Watcher relabeled and commented.
- Issue #125: CREATED by watcher — GITHUB_OUTPUT EOF delimiter regression. PR #117 fixed single-line→heredoc but heredoc `EOF` delimiter vulnerable to content containing literal "EOF". Likely-agent-fixable.
- Issue #125: RESOLVED — full pipeline chain: triage→coder→PR #126→reviewer→merge (14:48-14:52, 4 min). Auto-close miss #6 fixed by watcher (16:50). 6th consecutive auto-close miss — all caught by watcher safety net.
