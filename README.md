# AgentFolio

An open-source agentic portfolio engine. Fork it, drop in your resume, and deploy a portfolio site that adapts to each visitor's context.

## How It Works

AgentFolio renders a resume adapted to the target company and role. Each URL slug maps to a tailored adaptation with customized summaries and reordered sections.

```
/                    → default resume
/company-slug        → company-specific adaptation
/unknown             → 404 page
```

## Quick Start

1. **Fork** this repo
2. **Enable GitHub Pages:** go to Settings → Pages → Source → select **GitHub Actions**
3. **Replace** `data/input/resume.md` with your resume (any format — paste from LinkedIn, PDF text, or write markdown)
4. **Add target positions** in `data/input/jd/` — one `.md` file per role, filename becomes the URL slug (e.g., `data/input/jd/google.md` → `yoursite.com/google`)
5. **Set secret** `CLAUDE_CODE_OAUTH_TOKEN` on your fork — uses your Claude Pro/Team subscription instead of usage-based API billing
6. **Push** — GitHub Actions generates adapted resumes, PDFs, and deploys to GitHub Pages

No local runtime needed. No JSON to write. Just markdown and push.

## Personalization

All personal data lives in `data/input/`. Replace these files with your own:

| File | Purpose |
|------|---------|
| `data/input/resume.md` | Your resume in any text format |
| `data/input/jd/*.md` | Target positions (one .md per role, filename = URL slug) |
| `data/adapted/*.json` | Auto-generated adapted resumes — don't edit |
| `data/adapted/*.pdf` | Auto-generated PDFs — don't edit |

Framework code in `web/` and `.github/` is generic — you shouldn't need to modify it.

## Environment Variables

Set these in `web/.env.local` for development, or as GitHub Actions secrets/env for production:

| Variable | Purpose |
|----------|---------|
| `VITE_GITHUB_REPO` | `your-username/your-repo`. Auto-set in deploy workflow via `${{ github.repository }}`. |
| `VITE_BASE_PATH` | URL base path. Auto-detected: `/` for user pages, `/<repo-name>/` for project pages. |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Claude Code in the adapt workflow. Uses your Claude Pro/Team subscription instead of usage-based API billing. |

## Features

- **Adaptive resumes** — each JD gets a tailored version with reordered sections and customized summaries
- **PDF export** — auto-generated PDFs alongside each adaptation, with a download button on the site
- **Zero-runtime quickstart** — fork, add markdown files, push, deployed. No local tools needed.
- **JSON Resume theme** — renders all 12 JSON Resume sections using the developer-mono theme

## Architecture

```
web/              React SPA (Vite + TypeScript + styled-components)
.claude/skills/   Claude Code skills (adapt.md — resume adaptation)
data/input/       Your personal data (the only directory you edit)
data/             Also contains auto-generated outputs (adapted/)
.github/          GitHub Actions workflows (adapt, deploy, pdf)
```

## License

MIT
