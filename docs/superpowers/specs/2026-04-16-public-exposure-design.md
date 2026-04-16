# Public Exposure Prep — Design Spec

> Prepare the AgentFolio repo for developer discovery: README with live example, repo metadata, LICENSE file.

## Audience

Developers who'd fork and use it for their own portfolio. Optimize for "can I understand what this does and get it running in 5 minutes?"

## README Changes

### Hero section (new, top of file)

- One-line tagline (keep existing)
- Screenshot of the rendered default resume (full page, ~1200px wide)
- **[Live Demo](https://verkyyi.github.io/agentfolio/)** link, prominent
- Screenshot of the dashboard (notion selected, preview tab with fit-summary card visible)
- Brief caption: "Owner dashboard for reviewing fitted resumes, diffs, and PDFs"

### Features list (update existing)

Add to the existing features list:
- Owner dashboard — preview, diff, PDF, JD tabs for each fitted resume
- Fit summaries — auto-generated change descriptions for each adaptation
- Preset directives — research-backed resume optimization rules out of the box

### Rest of README

Keep as-is. Quick Start, Pipeline, Personalization, Architecture, Environment Variables — all good.

## Screenshots

Capture via Playwright from the live sample site:

| File | Source URL | Description |
|------|-----------|-------------|
| `docs/screenshots/resume.png` | `https://verkyyi.github.io/agentfolio/` | Default resume, full page |
| `docs/screenshots/dashboard.png` | `https://verkyyi.github.io/agentfolio/dashboard` | Dashboard with notion selected, preview tab |

Screenshots are committed to the repo so they render in the README on GitHub.

## Repo Metadata

Set via `gh repo edit`:

- **Description:** "Open-source agentic portfolio engine — fork, drop in your resume, deploy. Adapts to each target role with Claude."
- **Homepage URL:** `https://verkyyi.github.io/agentfolio/`
- **Topics:** `resume`, `portfolio`, `claude`, `github-pages`, `json-resume`, `ai`, `open-source`

## LICENSE File

Add MIT license file at repo root. The README already says "MIT" but the file is missing. Use the standard MIT template with year 2026.

## Out of Scope

- CONTRIBUTING.md, issue templates, social preview image — add later if traction
- Changing sample data or the live site content
- Any code changes to the app itself
