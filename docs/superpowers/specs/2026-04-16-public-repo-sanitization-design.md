# Sanitize AgentFolio for Public Release

## Summary

Transform agentfolio from a personal portfolio into a generic, forkable framework. Replace all personal data with sample data, make hardcoded references configurable, write CLAUDE.md, and rewrite README for fork-friendly onboarding.

## Motivation

AgentFolio is currently a personal portfolio site with the owner's real resume, company-specific adaptations, and hardcoded references throughout. To publish as a public repo that others can fork to build their own version, all personal data must be replaced with sample data, and hardcoded references must become configurable.

## Architecture: Fork-to-Deploy Model

The published repo is a complete, working app with sample data. Users fork it, replace `data/` files with their own resume and adaptations, set environment variables, and deploy. Framework code (components, hooks, styles, scripts, workflows) is fully generic.

## Data Layer

### Sample Resume (`data/resume.json`)

Replace with a fictional "Alex Chen" — Software Engineer in San Francisco. JSON Resume schema, same structure as the real resume:
- 2 work entries with highlights
- 2 projects with placeholder GitHub URLs
- Skills section with realistic keywords
- 1 education entry
- 1 volunteer entry
- Profiles: LinkedIn and GitHub (placeholder URLs)

### Sample Adaptations (`data/adapted/`)

Replace all existing files (apple.json, cohere.json, openai.json, default.json) with:
- `default.json` — generic adaptation of Alex Chen's resume
- `sample-company.json` — company-specific adaptation demonstrating how highlights, ordering, and match scores change

### Sample Companies (`data/companies/`)

Replace all existing files with:
- `default.json` — default company mapping
- `sample-company.json` — fictional company/role data

### Slug Registry (`data/slugs.json`)

Replace with one sample entry:
```json
{
  "sample": { "company": "sample-company", "role": "Software Engineer", "created": "2026-01-01", "context": "Sample slug for demo" }
}
```

### Deletions

- `data/llm_cache/` — delete all cached LLM outputs
- `data/analytics.json` — delete personal visitor analytics
- `web/public/data/` — the `copy-data` build step copies from `data/` into `web/public/data/`, so cleaning `data/` is sufficient. Also clean any stale files in `web/public/data/` that won't be regenerated.

## Hardcoded References

| Location | Currently | Becomes |
|----------|-----------|---------|
| `web/index.html` title | `Lianghui Yi — AgentFolio` | `AgentFolio` |
| `web/vite.config.ts` base | `'/agentfolio/'` | `process.env.VITE_BASE_PATH \|\| '/'` |
| `web/src/components/PipelineDiagram.tsx` line 20 | `const REPO = 'https://github.com/verkyyi/agentfolio'` | Derive from `import.meta.env.VITE_GITHUB_REPO` with fallback |
| `web/src/components/ArchitecturePage.tsx` line 87 | `href="https://github.com/verkyyi/agentfolio"` | Same — derive from env var |
| `.github/workflows/deploy.yml` line 40 | `VITE_GITHUB_REPO: verkyyi/agentfolio` | `VITE_GITHUB_REPO: ${{ github.repository }}` |
| `web/.env.example` | `VITE_GITHUB_REPO=verkyyi/agentfolio` | `VITE_GITHUB_REPO=your-username/your-repo` with explanatory comments |
| `scripts/chat_answer.py` line 26 | `"Lianghui Yi's"` hardcoded | Derive owner name from `resume.json` `basics.name` field |

## Tests

### Unit Test Fixtures

- `web/src/__tests__/App.test.tsx` — replace `name: 'Lianghui Yi'` and `email: 'verky.yi@gmail.com'` with sample data (`name: 'Alex Chen'`, `email: 'alex@example.com'`). The `defaultAdapted` and `cohereAdapted` fixtures become `defaultAdapted` and `sampleAdapted`.
- `web/src/__tests__/AdaptiveResume.test.tsx` — same: replace personal info in fixtures with sample data. Update any assertions that check for specific personal values.

### E2E Tests

- `web/e2e/adaptation-access.spec.ts` — update assertions from personal data (name, email, slug names) to sample data.

### Architecture Page

- `web/src/components/ArchitecturePage.tsx` — change `compareSlugs` default from `['cohere', 'openai', 'default']` to `['sample-company', 'default']`.

## Documentation

### CLAUDE.md (new, repo root)

Sections:
- **Project overview** — what AgentFolio is, fork-to-deploy model
- **Quick start** — `cd web && npm install && npm run dev`
- **Architecture** — monorepo layout: `web/` (React SPA), `data/` (personal data directory), `scripts/` (Python pipeline), `.github/workflows/`
- **Key conventions** — Vitest not Jest (`vi.fn()`), IntersectionObserver mock needed in tests, `import.meta.env` for env vars, JSON Resume schema
- **How to personalize** — replace `data/` files, set `VITE_GITHUB_REPO` and `VITE_GITHUB_PAT`, adjust `VITE_BASE_PATH` if not deploying to root
- **Testing** — `cd web && npm test`
- **Deployment** — GitHub Pages via Actions, required secrets

### README.md (rewrite)

Transform from personal project description to framework documentation:
- What AgentFolio is (one paragraph)
- Screenshot or demo link (optional, can add later)
- Quick start (fork, replace data, deploy)
- How it works (brief architecture overview, link to docs/architecture.md)
- Personalization guide (what files to edit)
- Environment variables reference
- License

## Not in Scope

- Setting up verkyyi.github.io personal fork (separate task)
- Rewriting git history (accepted: history contains personal info, current files are clean)
- Modifying adaptation pipeline scripts beyond `chat_answer.py` (they already read from data files)
- Removing `docs/superpowers/` (implementation history, not user-facing, harmless)
