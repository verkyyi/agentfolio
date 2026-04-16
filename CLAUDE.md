# AgentFolio

Open-source agentic portfolio engine. Detects visitor context via URL slugs and renders an adapted resume for the target role.

## Quick Start

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173/` to see the sample portfolio.

## Project Structure

```
agentfolio/
├── data/                    # Personal data (replace with your own)
│   ├── resume.json          # Base resume (JSON Resume schema)
│   ├── adapted/             # Company-specific adapted resumes
│   ├── companies/           # Company/role metadata
│   ├── slugs.json           # URL slug → company mapping
│   └── llm_cache/           # Cached LLM outputs (auto-generated)
├── web/                     # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # CSS
│   │   ├── types.ts         # TypeScript types
│   │   └── __tests__/       # Vitest unit tests
│   ├── e2e/                 # Playwright E2E tests
│   └── vite.config.ts       # Vite config
├── scripts/                 # Python adaptation pipeline
│   ├── adapt_one.py         # Adapt resume for one company
│   ├── adapt_all.py         # Adapt all companies
│   ├── chat_answer.py       # Chat widget answer generation
│   ├── fetch_jds.py         # JD auto-fetching
│   └── aggregate_feedback.py # Analytics aggregation
└── .github/workflows/       # GitHub Actions
    ├── deploy.yml           # Build + deploy to GitHub Pages
    ├── adapt.yml            # Adaptation pipeline
    ├── chat-on-request.yml  # Chat answer workflow
    ├── analytics.yml        # Analytics aggregation
    └── jd-sync.yml          # JD auto-fetching
```

## Key Conventions

- **Test framework:** Vitest, not Jest. Use `vi.fn()`, `vi.mock()`, etc.
- **Env vars:** Access via `import.meta.env.VITE_*` in browser code, `process.env.*` in Node/Vite config.
- **Resume schema:** All resume data follows JSON Resume format. Types in `web/src/types.ts`.
- **IntersectionObserver:** Must be mocked in tests — jsdom doesn't support it.
- **Build pipeline:** `npm run copy-data` syncs `data/` → `web/public/data/` before every build/dev start.

## How to Personalize

1. Replace `data/resume.json` with your resume (follow the JSON Resume schema)
2. Run `python -m scripts.adapt_all` to generate adaptations (or create them manually)
3. Update `data/slugs.json` with your company slugs
4. Set env vars (see below)
5. Push to trigger deploy

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_GITHUB_PAT` | `.env.local` / Actions secret `GH_ISSUES_PAT` | GitHub PAT for issues API (analytics, chat) |
| `VITE_GITHUB_REPO` | `.env.local` / `deploy.yml` | `owner/repo` for GitHub API calls |
| `VITE_BASE_PATH` | `.env.local` / `deploy.yml` | URL base path (default `/`) |
| `ANTHROPIC_API_KEY` | Actions secret | For chat answers and LLM summary polish |

## Testing

```bash
cd web
npm test              # Run all unit tests
npx vitest run        # Same, non-watch mode
npx playwright test   # E2E tests (requires built site)
```

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. Set `GH_ISSUES_PAT` as a repository secret if you want analytics and chat features.
