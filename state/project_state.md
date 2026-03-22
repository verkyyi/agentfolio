# Project State
# This file is written by every workflow run at exit.
# Read at start of every workflow run.
# Committed to repo — git history is the full audit trail.

Last updated: 2026-03-22T05:30:00Z
Updated by: watcher.yml

## Last Session
Action: watcher.yml — pipeline health check (hour 05)

Done:
- All failed runs (self-evolve 2x, coder 2x, reviewer 3x, deploy 3x, analyze 1x) confirmed ALREADY-FIXED
- Closed issue #16 (PR #18 merged at 04:30:45Z — GitHub did not auto-close)
- Removed agent-ready label from issue #13 (PR #19 open, reviewer already ran at 04:30)
- Removed agent-ready label from issue #17 (PR #20 open, reviewer already ran at 04:32)
- 3 corrective actions taken (at limit)

In progress: PRs #19 (anti-sycophancy, closes #13) and #20 (agentic security, closes #17) awaiting human review/merge

## Open Items (priority order)
1. Issue #12: [BLOCKED — human] CLAUDE_CODE_OAUTH_TOKEN missing `workflows` OAuth scope — blocks all workflow YAML PRs and issue #8 Node.js upgrade. Fix: add PAT with `workflow` scope as WORKFLOW_PAT secret.
2. PR #19: [awaiting human review] Anti-sycophancy guardrails for adversarial-review.md (gstack v0.9.9.0 pattern, closes #13)
3. PR #20: [awaiting human review] Agentic security patterns — supply chain hygiene + prompt injection defense (closes #17)
4. Issue #10: [needs-review label — awaiting human review] Last-updated badge user-friendly time
5. Issue #8: [BLOCKED by #12] Upgrade Node.js 20 actions before June 2026 deadline
6. Issue #5: [parked] Adopt structured review tables in skill output (gstack v0.9.7.0)
7. Profile page: 5/8 sections still unchecked — live stats, evolution timeline, capabilities inventory, architecture diagram, getting started guide
8. apps/profile content not yet populated — discover.yml or manual issue needed

## Metrics Snapshot
Period: 2026-03-15 to 2026-03-22 (first full week tracked)
- Total commits: 64+
- Agent-log actions: 12 evolve runs, 3 coder, 2 watcher, 1 discover, 1 analyze
- Features shipped: 3 (adversarial-review skill, Codex blog, feedback link)
- Issues opened by agent: 7 (#4, #8, #9, #12, #13, #16, #17)
- Issues closed: 4 (#1, #4, #9, #14)
- PRs merged: 5 (#6, #7, #11, #15, #18)
- Workflow failures resolved: 10+ (all ALREADY-FIXED as of 2026-03-22)
- Persistent blockers: 1 (#12, human intervention needed)
- Research entries: 58 across 3 tiers

## Notes for Next Agent
KEY BLOCKER: CLAUDE_CODE_OAUTH_TOKEN lacks `workflows` OAuth scope — any coder task touching workflow YAML will fail at push. Human intervention needed (see issue #12: add PAT with `workflow` scope as WORKFLOW_PAT secret).

- PRs #19 (closes #13) and #20 (closes #17) are open and awaiting human review — reviewer already ran for both
- Issue #16 is closed (PR #18 merged, watcher closed it this run)
- Codex blog live at /codex, seed article at /codex/harness-engineering-intro
- adversarial-review.md skill created and merged (PR #6); pre-merge gate section added (PR #18)
- iOS Safari overflow fix merged (PR #15)
- Profile page: only hero section live — live stats, timeline, capabilities, architecture, getting-started all pending
- gstack v0.9.9.0 anti-sycophancy pattern: agent must not soften findings under pushback — "direct to discomfort" principle (PR #19 pending)
- Agentic security patterns from everything-claude-code — PR #20 pending
- Node.js 20 deprecation: all workflows — deadline June 2, 2026 (blocked by token permission, issue #8)
- evolve deduplication: consecutive runs within same hour often find same sources unchanged — opportunity to cache "last checked" per source
- everything-claude-code restored credits in latest commit (2026-03-22T02:48:20Z) — reversed yesterday's supply chain hygiene commit; no new harness pattern
