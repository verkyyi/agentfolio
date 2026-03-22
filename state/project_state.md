# Project State
Last updated: 2026-03-22T13:45:00Z
Updated by: CLI session (human + Claude Code)

## Last Session
Action: CLI session — evolve history gap, generic evolve, atomic state writes, issue cleanup

Done:
- Fixed evolve dedup: --state all --limit 100 (closes history gap)
- Fixed #36: removed --fallback-model from haiku workflows
- Upgraded all 10 workflows to opus/max with model aliases (auto-upgrade on new releases)
- Removed --allowedTools from all workflows (redundant with bypassPermissions)
- Added deterministic issue close to reviewer (closingIssuesReferences API)
- Added DeerFlow + awesome-claude-code + OpenAI blog as research sources
- Removed Codex blog section (was a misunderstanding)
- Made repo fork-ready: dynamic repo refs, site URL, onboarding docs
- Built generic evolve system: config-driven workflows for any repo
  - Onboarding gate on all 11 workflows (state/evolve_config.md)
  - Config injection into all prompts (LLM-level adaptation)
  - Dynamic research sources, conditional analysis steps
  - Config-driven build/test commands (no hardcoded npm)
  - 7-day re-check + scaffold version check
  - Workflow YAML frozen for adopters via learned rule
  - Interactive onboarding doc (11 steps with repo analysis + Q&A)
- Atomic state writes via GitHub API (scripts/commit-state.sh)
  - Replaces git add/commit/push for state files
  - SHA-based optimistic locking, retry on 409
  - No more push conflicts between concurrent workflows
- Frontend: client-side live timestamps, stats via GitHub search API
- Frontend: simplified page (single latest-action line, 4 self-evolution stats)
- Fixed #40: closed issues count (search API), #41: Codex refs, #42: onboarding gaps
- Closed #38 (README auto-maintenance — evolve handles it)
- Added MIT license

Key decisions:
- Model aliases (opus/sonnet) instead of hardcoded IDs — auto-upgrade
- LLM-level config adaptation over bash-level branching — simpler
- Single-project focus for adopters (no apps/ directory)
- Workflow YAML frozen for adopters, self-evolving for agentfolio
- GitHub API for state writes, git for code changes

## Open Items
1. Issue #22: [needs-human] Submit to awesome-claude-code — waiting until March 27 (7-day repo age)

## Critical Note for Next Agent
- All workflows now gate on state/evolve_config.md — if this file is deleted, everything stops
- State writes use scripts/commit-state.sh (GitHub API) — no more git push for state/
- Evolve reads Research Sources from config, not hardcoded curl commands
- Model aliases (opus/sonnet) auto-resolve to latest — no manual version bumps needed

## Metrics Snapshot
Period: 2026-03-22 CLI session
- Commits this session: 61
- Issues closed: #5, #8, #10, #13, #17, #21, #26, #28, #29, #31, #33, #35, #36, #38, #40, #41, #42
- Issues remaining: 1 (#22)
- PRs closed: #37
