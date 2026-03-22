# Onboarding Guide

A step-by-step walkthrough for setting up your autonomous project scaffold on agentfolio. For the high-level overview, see the [README](../README.md).

---

## Prerequisites

- A **GitHub account** with permissions to fork repositories and configure Actions
- A **Claude Code OAuth token** (run `claude setup-token` to generate)
- Basic familiarity with **GitHub Actions** (knowing how to trigger workflows and read logs is enough)

---

## Setup (3 Steps)

### 1. Fork the Repo

Click **"Use This Template"** or fork [agentfolio](https://github.com/verkyyi/agentfolio) into your own GitHub account.

### 2. Add Your OAuth Token

Go to **Settings → Secrets and variables → Actions** and add:

| Name | Value |
|------|-------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Your Claude Code OAuth token (run `claude setup-token` to generate) |

Optional: Add `WORKFLOW_PAT` (a personal access token with `workflows` scope) if you want agents to modify workflow YAML files.

### 3. Enable GitHub Pages

Go to **Settings → Pages** and set:

- **Source:** `GitHub Actions`

The site URL will automatically resolve to `https://<your-username>.github.io/agentfolio`.

That's it. The pipeline starts on the next hourly cron cycle, or you can manually trigger any workflow from the Actions tab.

---

## How It Works

Eleven workflows form the autonomous pipeline:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `evolve.yml` | Hourly | Researches external sources, analyzes pipeline health, creates improvement issues |
| `triage.yml` | On issue created | Labels and routes issues to the right agent |
| `coder.yml` | On issue labeled `agent-ready` | Writes code to fix issues, opens PRs |
| `reviewer.yml` | On PR opened | Reviews PRs, merges if safe, closes linked issues |
| `deploy.yml` | On push to `main` | Builds Astro site and deploys to GitHub Pages |
| `watcher.yml` | Every 30 min | Monitors pipeline health, unblocks stalled chains |
| `feedback-learner.yml` | On issue/PR closed | Learns from human corrections, updates rules |
| `growth.yml` | Every 6 hours | Tracks growth metrics, creates releases, suggests distribution |
| `analyze.yml` | Weekly | Generates weekly summary of agent activity |
| `discover.yml` | Manual | Bootstraps a new project under `apps/` |
| `claude-task.yml` | Manual | Runs arbitrary tasks via workflow dispatch |

### The Pipeline Loop

```
evolve (finds improvement) → triage (labels issue) → coder (writes fix)
→ reviewer (merges PR) → deploy (ships it) → watcher (verifies health)
```

Human corrections at any point become permanent learned rules via `feedback-learner.yml`.

---

## Adding Your Own Project

Create a directory under `apps/`:

```
apps/
  my-project/
    CLAUDE.md          # Agent rules and autonomy settings
    FEATURE_STATUS.md  # Auto-generated; tracks feature completion
```

Start by creating `CLAUDE.md` with your project description and constraints. Then trigger the **Discover Project** workflow manually — it will analyze your `CLAUDE.md` and generate initial state.

---

## Customizing Rules

Each project's behavior is governed by `apps/your-project/CLAUDE.md`:

```markdown
# My Project

## What This Is
A CLI tool for ...

## Autonomy
- The agent MAY commit directly to `main` for documentation changes.
- The agent MUST open a PR for any code changes.
- The agent MUST NOT modify files outside `apps/my-project/`.

## Style
- Use TypeScript with strict mode enabled.
- Prefer functional patterns over classes.
```

Key knobs:
- **MAY / MUST / MUST NOT** — set permission boundaries
- **Scope constraints** — limit which directories the agent can touch
- **Style guides** — enforce coding conventions without manual review

---

## State Files

| File | Purpose |
|------|---------|
| `state/project_state.md` | Current goals, priorities, and session summaries. Updated every workflow run. |
| `state/agent_log.md` | Chronological log of every agent action. Read at build time for the site badge. |
| `state/research_log.md` | External research findings from evolve.yml. Append-only. |
| `state/learned_rules.md` | Rules learned from human feedback. Read by all workflows. |
| `state/usage_log.md` | Token usage metrics per workflow run. |

These files are committed to the repo — git history is the full audit trail.

---

## Monitoring

**Actions tab** — See live workflow runs, logs, and failures at `github.com/<you>/agentfolio/actions`.

**Git log** — Every agent action produces a structured commit:
```bash
git log --oneline state/
```

**Agent badge** — The portfolio site shows "maintained by agent · last update 2h ago" with a link to recent commits.

If something looks wrong, edit `CLAUDE.md` to add a constraint and the agent will respect it on the next run.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflows fail with "Invalid OAuth token" | Add `CLAUDE_CODE_OAUTH_TOKEN` secret (Step 2) |
| Site shows 404 | Enable GitHub Pages with source "GitHub Actions" (Step 3) |
| Coder can't push workflow YAML changes | Add `WORKFLOW_PAT` secret with `workflows` scope |
| Bot merges blocked by branch protection | Allow `github-actions[bot]` to bypass review requirements |
| State files look stale after forking | They auto-update on the first pipeline run |
