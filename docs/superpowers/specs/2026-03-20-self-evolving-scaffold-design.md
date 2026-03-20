# Self-Evolving Scaffold — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Approach:** Incremental Transform (from portfolio scaffold to self-evolving harness)

---

## Overview

Transform Agentfolio from a personal portfolio scaffold into a general-purpose, self-evolving harness. The scaffold's first project is itself — it uses its own workflows to improve its own workflows, its own CLAUDE.md to refine its own CLAUDE.md. A repo profile page replaces the portfolio as the public face.

### Core Principles

- **The repo IS the system.** No servers, no databases. GitHub is the infrastructure.
- **Self-referential, not duplicative.** `apps/scaffold/` contains rules about how to evolve the harness, not a copy of it.
- **Reactive + proactive.** The scaffold fixes its own failures AND adopts external best practices.
- **Tiered autonomy.** Safe changes auto-commit; structural changes need human review.

---

## 1. Architecture

### What stays (root level)

```
.github/workflows/       # The engine — all workflows live here
state/                   # agent_log.md, project_state.md, research_log.md
skills/                  # Harness skills (generalized)
CLAUDE.md                # Root constitution
```

### What changes

```
apps/scaffold/           # Self-referential project (rules for evolving the harness)
  CLAUDE.md              # "How to improve yourself" rules
  FEATURE_STATUS.md      # Scaffold improvement tracker

apps/profile/            # Repo's public profile page
  CLAUDE.md              # Content/display rules for the profile
  FEATURE_STATUS.md      # Profile feature tracker

src/                     # Minimal static site for repo profile (replaces portfolio)
content/                 # Repo-focused content (not personal portfolio)
```

### What gets removed

- `content/profile.json` — personal portfolio data
- `content/projects/example.md` — portfolio project cards
- `content/llms.txt` — personal AI-readable profile
- `apps/portfolio/` — entire folder
- `plugin/` — entire folder (premature)
- Portfolio-specific page templates in `src/`

### Workflow mapping

| Current | Becomes | Purpose |
|---|---|---|
| `deploy.yml` | `deploy.yml` | Stays — builds whatever's in `src/` |
| `onboard.yml` | `discover.yml` | Scans new `apps/*/` entries, infers stack, generates rules |
| `triage.yml` | `triage.yml` | Stays — classifies issues |
| `coder.yml` | `coder.yml` | Stays — implements fixes |
| `reviewer.yml` | `reviewer.yml` | Stays — reviews PRs |
| `maintenance.yml` | `evolve.yml` | Self-evolution: analyzes failures, fetches research, proposes improvements |
| `growth.yml` | `analyze.yml` | Improvement analysis: skill gaps, workflow inefficiencies |
| `claude-task.yml` | `claude-task.yml` | Stays — manual dev channel |

### Self-referential loop (no duplication)

The harness (root level) is the single source of truth for workflows, state, and the constitution. `apps/scaffold/` does not duplicate the harness — it is a lens on it, containing rules about how to evolve the harness. The actual workflows, skills, and state files remain in their canonical locations.

```
Agent runs evolve.yml
  -> reads root CLAUDE.md (harness rules)
  -> reads apps/scaffold/CLAUDE.md (self-improvement rules)
  -> analyzes its OWN workflows, skills, failure log
  -> proposes improvements via PR (governed by autonomy tiers)
  -> reviewer.yml reviews the PR
  -> human approves structural changes, safe ones auto-merge
```

---

## 2. Project Discovery (`discover.yml`)

When a new folder appears in `apps/`, the agent autonomously figures out what it is and sets it up.

### Trigger

Manual dispatch, or automatically when `evolve.yml` detects a new `apps/*/` folder without a `CLAUDE.md`.

### Discovery flow

1. **Scan** the folder — file extensions, package.json, Dockerfile, config files, directory structure
2. **Infer** the stack — language, framework, build tool, test runner
3. **Generate** `apps/<name>/CLAUDE.md` — autonomy rules tailored to what was found
4. **Generate** `apps/<name>/FEATURE_STATUS.md` — initial feature inventory
5. **Open** a `needs-review` PR with the generated files

### Generated CLAUDE.md contains

- Project description (inferred)
- Stack details
- Build/test/deploy commands (discovered from config files)
- Content rules (if applicable)
- Autonomy overrides (conservative defaults — everything starts as `needs-review`)

### What discovery does NOT do

- Modify the project's own code
- Create per-project workflows (shared workflows handle all projects)
- Assume any specific framework

Discovery heuristics live in skill files and improve over time via `evolve.yml`.

---

## 3. Self-Evolution Loop (`evolve.yml`)

The core differentiator — the scaffold improving itself.

### Trigger

Daily cron (replaces maintenance.yml's schedule).

### The loop

1. **Read state** — `state/agent_log.md`, failure log in `CLAUDE.md`, recent git history
2. **Research** — fetch external knowledge:
   - Anthropic's engineering blog for Claude Code updates
   - GitHub's blog/changelog for Actions and Issues API changes
   - Key reference repos (from README.md references) for new patterns
   - Summarize findings relevant to the harness
3. **Analyze** — informed by both internal failures AND external trends:
   - Repeated failures -> propose a new rule in CLAUDE.md failure log
   - Workflow inefficiencies -> propose workflow changes
   - Missing skills -> draft a new skill file
   - Undiscovered projects -> trigger discovery
4. **Act** — based on autonomy tiers:
   - **Auto-commit**: failure log entries, state updates, skill wording/clarity
   - **PR (auto-merge)**: minor skill improvements, FEATURE_STATUS updates
   - **PR (needs-review)**: workflow YAML changes, CLAUDE.md rule changes, new skills, research-inspired changes
5. **Log** — append actions and research findings to state files

### Safety rails

- The agent cannot promote its own autonomy (e.g., move `needs-review` to `auto-commit`)
- Workflow YAML changes always require human review
- Max one structural PR per run — prevents cascading self-modifications
- Each self-improvement PR must state what failure or inefficiency triggered it
- All research-inspired changes require human review

### Example cycle

```
Day 1:  coder.yml fails because it doesn't handle monorepo test paths
Day 1:  Failure logged in CLAUDE.md failure log (auto-commit)
Day 2:  evolve.yml reads failure log, proposes coder.yml patch (needs-review PR)
Day 2:  Human approves -> merged
Day 3:  evolve.yml verifies the fix worked, updates FEATURE_STATUS (auto-commit)
```

---

## 4. Research Log (`state/research_log.md`)

New state file for tracking external knowledge.

### Format

Append-only, like `agent_log.md`.

### Each entry records

- Date
- Sources checked
- Key findings
- Action taken (or "no action — noted for future reference")

### Autonomy

- Writing to `research_log.md`: auto-commit (always)
- Acting on research findings: needs-review PR (always)

---

## 5. Repo Profile Page

The scaffold's public face — a live dashboard of its own activity.

### What it displays

- **Hero**: Repo name, tagline, what the scaffold does
- **Live stats**: Total agent commits, self-improvements made, failures caught and fixed (from `state/agent_log.md` at build time)
- **Evolution timeline**: Recent agent activity — what it changed and why
- **Capabilities**: Current skills inventory (read from `skills/` directory)
- **Architecture diagram**: How the harness works
- **Getting started**: How to fork and use the scaffold

### Content source (no new CMS)

- `state/agent_log.md` -> activity feed, stats
- `state/research_log.md` -> "what the scaffold learned recently"
- `skills/*.md` -> capabilities list
- `CLAUDE.md` failure log -> "mistakes it won't make again"

### How it stays fresh

`evolve.yml` updates state files -> triggers `deploy.yml` -> profile page rebuilds with latest data. No manual content management needed.

### Stack

Astro (already present). Single page. Minimal styling.

### `apps/profile/CLAUDE.md` rules

- Auto-commit: stat regeneration, activity feed updates
- Needs-review: layout changes, new sections, copy changes to hero/tagline

---

## 6. State Management

### State files

| File | Purpose | Access |
|---|---|---|
| `state/project_state.md` | Session state, read at start / written at end of every run | Read/write |
| `state/agent_log.md` | Append-only action history | Append only |
| `state/research_log.md` | External research findings from evolve.yml | Append only |

### Per-project state

Lives in `apps/*/FEATURE_STATUS.md`, not in `state/`. Keeps project-specific tracking close to project rules. `state/` stays harness-level.

### State read order (every workflow)

1. `state/project_state.md` — what happened last
2. `CLAUDE.md` — harness rules
3. `apps/<relevant>/CLAUDE.md` — project rules
4. `apps/<relevant>/FEATURE_STATUS.md` — project status

---

## 7. Autonomy Rules

### AUTO — commit directly

- State file updates (`project_state.md`, `agent_log.md`, `research_log.md`)
- Failure log entries in `CLAUDE.md`
- Skill file wording/clarity improvements (no behavioral changes)

### PR — auto-merge

- Lint and type fixes
- FEATURE_STATUS updates
- Profile page stat regeneration
- Minor skill improvements (behavioral, but low-risk)

### PR — needs-review

- Workflow YAML changes (always)
- CLAUDE.md autonomy rule changes
- New skill files
- Any change inspired by external research
- Profile page layout/copy changes
- Discovery-generated CLAUDE.md for new projects

### NEVER auto-execute

- Deleting files or content
- Promoting its own autonomy tier
- Modifying auth/secrets configuration
- More than one structural PR per evolve.yml run
