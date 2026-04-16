# AgentFolio

An open-source agentic portfolio engine. Fork it, drop in your resume, and deploy a portfolio site that adapts to each visitor's context.

## How It Works

AgentFolio detects who's visiting via URL slugs and renders a resume adapted to the target company and role. Each slug maps to a pre-built adaptation with tailored summaries, reordered sections, and match scores.

```
/                    → default resume
/c/company-slug      → company-specific adaptation
/c/unknown           → falls back to default
```

## Quick Start

1. **Fork** this repo
2. **Replace** `data/resume.json` with your resume ([JSON Resume](https://jsonresume.org/) schema)
3. **Generate adaptations:**
   ```bash
   pip install anthropic   # needed for LLM features
   python -m scripts.adapt_all
   ```
4. **Run locally:**
   ```bash
   cd web && npm install && npm run dev
   ```
5. **Deploy:** push to `main` — GitHub Actions builds and deploys to GitHub Pages automatically

## Personalization

All personal data lives in `data/`. Replace these files with your own:

| File | Purpose |
|------|---------|
| `data/resume.json` | Your base resume (JSON Resume schema) |
| `data/companies/*.json` | Target company/role metadata |
| `data/adapted/*.json` | Adapted resumes (generated or manual) |
| `data/slugs.json` | URL slug → company mapping |

Framework code in `web/`, `scripts/`, and `.github/` is generic — you shouldn't need to modify it.

## Environment Variables

Set these in `web/.env.local` for development, or as GitHub Actions secrets/env for production:

| Variable | Purpose |
|----------|---------|
| `VITE_GITHUB_PAT` | Fine-grained PAT with `issues:read+write` on your fork. Enables analytics and chat. |
| `VITE_GITHUB_REPO` | `your-username/your-repo`. Auto-set in deploy workflow via `${{ github.repository }}`. |
| `VITE_BASE_PATH` | URL base path. Default `/`. Set to `/repo-name/` if deploying to `username.github.io/repo-name/`. |
| `ANTHROPIC_API_KEY` | For chat widget and LLM summary polish (Actions secret only, never in client). |

## Features

- **Adaptive resumes** — each company slug gets a tailored version with reordered sections and customized summaries
- **Match scores** — weighted scoring shows how well your profile fits each role
- **Chat widget** — visitors can ask questions about your background (powered by Claude via GitHub Actions)
- **Analytics** — anonymous engagement tracking via GitHub Issues
- **Architecture page** — `/how-it-works` shows the pipeline and side-by-side adaptation comparisons

## Architecture

See `docs/architecture.md` for the full design.

```
web/           React SPA (Vite + TypeScript)
scripts/       Python adaptation pipeline
data/          Your personal data (the only directory you edit)
.github/       GitHub Actions workflows
```

## License

MIT
