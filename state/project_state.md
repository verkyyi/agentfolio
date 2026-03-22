# Project State
# This file is written by every workflow run at exit.
# Read at start of every workflow run.
# Committed to repo — git history is the full audit trail.

Last updated: 2026-03-22T09:16:00Z
Updated by: coder.yml (fix issue #35 — human activity detection for pipeline conflict prevention)

## Last Session
Action: coder.yml — implemented issue #35 (human activity detection + human-wip label)

Done:
- coder.yml: added "Check for human activity" step — checks human-wip label (skips issue) + git log 2h window for non-bot commits; all downstream steps gated with `steps.human_check.outputs.SKIP != 'true'`
- evolve.yml: added "Check for human activity" step + prompt appendix for read-only mode (skips state writes + issue creation when HUMAN_ACTIVE); auto-commit, trigger triage, trigger discovery steps gated; human-wip + triaged labels added to Ensure labels step
- watcher.yml: added "Check for human activity" step + prompt section for health-check-only mode (skips corrective actions when HUMAN_ACTIVE); human-wip issues always skipped regardless of HUMAN_ACTIVE
- triage.yml: added "Check for human activity" step — checks human-wip label + human commits; prompt updated to use 'triaged' instead of 'agent-ready' when human active; "Trigger coder if agent-ready" step gated on both HUMAN_ACTIVE and HUMAN_WIP
- README.md: added "Claiming an issue for CLI work" section (human-wip label, human-active mode table) + "Ending a CLI session" protocol
- Build passing (exit 0)

In progress: PR for issue #35 (needs-review — workflow YAML changes)

## Open Items (priority order)
1. Issue #35: [PR opened — needs-review] Human activity detection for pipeline conflict prevention
2. Issue #8: [agent-ready — UNBLOCKED] Upgrade Node.js 20 actions before June 2026 deadline
3. PR #19: [reviewer re-triggered] Anti-sycophancy guardrails for adversarial-review.md (closes #13)
4. PR #20: [reviewer re-triggered] Agentic security patterns — supply chain hygiene + prompt injection defense (closes #17)
5. Issue #22: [needs-review] Submit to hesreallyhim/awesome-claude-code (29k stars)
6. Issue #10: [needs-review — awaiting human] Last-updated badge user-friendly time
7. Issue #21: [feature] Add DeerFlow repo to external sources
8. Profile page: 5/8 sections still unchecked

## Metrics Snapshot
Period: 2026-03-15 to 2026-03-22 (first full week tracked)
- Total commits: 65+
- Stars: 1 | Forks: 0 | Adopters: 0

## Notes for Next Agent
- PR for issue #35 modifies 4 workflow YAML files — must use WORKFLOW_PAT for push and labeled needs-review per autonomy rules
- Detection logic: `git log origin/main --since="2 hours ago" --format="%an" | grep -v "agentfolio\[bot\]"` — filters out bot commits
- human-wip label (yellow #e4e669) created by evolve.yml Ensure labels step
- triaged label (green #c2e0c6) created by evolve.yml Ensure labels step
- PRs #19 and #20 still awaiting human review
