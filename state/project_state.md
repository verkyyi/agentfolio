# Project State
# This file is written by every workflow run at exit.
# Read at start of every workflow run.
# Committed to repo — git history is the full audit trail.

Last updated: 2026-03-22T09:30:00Z
Updated by: CLI session (human + Claude Code)

## Last Session
Action: CLI session — pipeline diagnostics, conflict avoidance, session enforcement

Done:
- Fixed #12: added WORKFLOW_PAT fallback to coder.yml checkout, smart failure handler (needs-human label for infra issues), triage PIPELINE-FIX split
- Watcher unblocking: added recently-closed issues to watcher data collection + responsibility #6 (unblock needs-human issues when blocker resolves)
- Created issue #23: watcher outcome checks (monitors signals not outcomes gap)
- Created issue #26: CLI optimization (--model/--effort/--fallback-model/--permission-mode for all 10 workflows)
- Created issue #28: token utilization feedback loop (self-optimizing CLI config against Max plan quota)
- Created issue #33: human intent learning, PR close handling, interaction guide
- Created issue #35: CLI/pipeline conflict avoidance (commit-based detection + human-wip labels)
- Implemented #35: all 4 write-capable workflows (triage, coder, watcher, evolve) now check for recent human commits and back off when human is active
- Added SessionEnd hook (.claude/hooks/session-end.sh + .claude/settings.json) to auto-commit state changes when CLI sessions end
- Updated CLAUDE.md session protocol to include CLI sessions
- Hook skips workflow runs (GITHUB_ACTIONS check) and -p mode

Key decisions:
- Two-layer conflict detection: Layer 1 = commit-based (auto, 2h window), Layer 2 = human-wip label (explicit, persists)
- No real-time GitHub mirroring of CLI sessions — too noisy. Session summaries are the right level of observability.
- Evolve history gap (research_log not read, closed issues not checked) deferred — tracked in Claude memory

## Open Items (priority order)
1. Issue #36: [URGENT] Watcher + feedback-learner fail — --fallback-model==main model regression from PR #27
2. PR #19: [needs-review] Anti-sycophancy guardrails (closes #13)
3. PR #20: [needs-review] Agentic security patterns (closes #17)
4. Issue #8: [agent-ready — UNBLOCKED] Upgrade Node.js 20 actions before June 2026
5. Issue #22: [needs-review] Submit to awesome-claude-code (29k stars) — requires human external action
6. Issue #10: [needs-review] Last-updated badge user-friendly time
7. Issue #21: [feature] Add DeerFlow repo to external sources
8. Issue #31: [evolve-finding] Cache research source checksums
9. Issue #5: [evolve-finding] Structured review tables — coder may have opened PR

## Deferred
- Evolve history gap: evolve doesn't read research_log.md or check closed issues for deduplication. Three fixes proposed (A: read tail-30 research log, B: check closed issues, C: periodic compression). Saved in Claude memory for next session.

## Critical Note for Next Agent
- Issue #36 is top priority — watcher and feedback-learner are broken
- CLI sessions now trigger human-activity detection: workflows back off when recent non-bot commits exist on main
- SessionEnd hook enforces state commits on CLI session exit
- WORKFLOW_PAT secret is now configured — coder can push workflow YAML changes

## Metrics Snapshot
Period: 2026-03-15 to 2026-03-22
- Total commits: 75+
- Stars: 1 | Forks: 0 | Adopters: 0
- This CLI session: 5 commits, 5 issues created, 1 issue closed (#12)
