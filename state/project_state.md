# Project State
# This file is written by every workflow run at exit.
# Read at start of every workflow run.
# Committed to repo — git history is the full audit trail.

Last updated: 2026-03-22T00:16:11Z
Updated by: evolve.yml

## Last Session
Action: evolve.yml — tier-0 research run (hour 00:16 UTC)
Done:
- Researched 5 sources: claude-code (core), gstack (core), everything-claude-code (core), wshobson/agents (tier 0), VoltAgent/awesome-claude-code-subagents (tier 0)
- KEY FINDING: gstack v0.9.9.0 released — anti-sycophancy + pushback patterns for /office-hours skill (new since v0.9.8.0)
- Pipeline health: all 10 failed runs ALREADY-FIXED; issue #12 still covers the workflow permission blocker
- Design evaluation: healthy — mobile breakpoints in place, Cosmic language consistent
- Created issue #13: anti-sycophancy guardrails for adversarial-review.md (gstack v0.9.9.0 pattern)

In progress: none

## Open Items
- Issue #8: [pipeline] Upgrade Node.js 20 actions before June 2026 deadline (BLOCKED by #12, no agent-ready)
- Issue #10: [feedback] last updated badge user-friendly time (triage completed, awaiting coder)
- Issue #12: [pipeline] Coder blocked from pushing workflow YAML — needs workflows permission on token (human intervention needed)
- Issue #5: [evolve] Adopt structured review tables in skill output (no agent-ready, parked)
- Issue #13: [evolve] Add anti-sycophancy guardrails to agent skills (gstack v0.9.9.0 pattern) — new, awaiting triage
- apps/profile content not yet populated — discover.yml or manual issue needed

## Metrics Snapshot
(empty — analyze.yml will populate after first weekly run)

## Notes for Next Agent
The scaffold is healthy. Key blocker: CLAUDE_CODE_OAUTH_TOKEN lacks `workflows` OAuth scope — any coder task touching workflow YAML will fail at push. Human intervention needed (see issue #12: add PAT with `workflow` scope as WORKFLOW_PAT secret).
- Codex blog live at /codex, seed article at /codex/harness-engineering-intro
- adversarial-review.md skill created and merged (PR #6)
- Codex blog added and merged (PR #7)
- Feedback entry point added to index.astro (PR #11, merged)
- gstack v0.9.9.0 anti-sycophancy pattern: agent must not soften findings under pushback — "direct to discomfort" principle
- gstack v0.9.8.0 pre-merge readiness gate pattern noted — potential future skill
- Node.js 20 deprecation: all workflows — deadline June 2, 2026 (blocked by token permission)
- everything-claude-code trending at 3184 repos, growing steadily
