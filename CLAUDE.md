# AgentFolio

Open-source agentic portfolio engine. See `README.md` for setup and personalization.

## Project Structure

```
agentfolio/
├── data/                    # Personal data (replace with your own)
│   ├── input/               # ← User input (the only directory you edit)
│   │   ├── resume.md        # Your resume (any text format — source of truth)
│   │   └── jd/              # Target job descriptions (one .md per role)
│   └── adapted/             # Adapted resumes + PDFs (auto-generated)
├── web/                     # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # ResumeTheme, DownloadPdf
│   │   ├── hooks/           # useAdaptation
│   │   ├── styles/          # Global CSS
│   │   ├── types.ts         # TypeScript types
│   │   └── __tests__/       # Vitest unit tests
│   └── e2e/                 # Playwright E2E tests
├── .claude/skills/          # Claude Code skills
│   └── adapt.md             # /adapt — generate adapted resumes
└── .github/workflows/       # GitHub Actions
    ├── deploy.yml           # Build + deploy to GitHub Pages
    ├── adapt.yml            # Generate adaptations on data/input/ changes
    └── pdf.yml              # Generate PDFs from adapted JSON
```

## Routing

Slugs live at the root — no `/c/` prefix:

```
/                → data/adapted/default.json
/notion          → data/adapted/notion.json
/unknown         → 404 page
```

The slug is the first path segment after the base path. `useAdaptation` parses it and fetches `data/adapted/{slug}.json` directly. Unknown slugs return a 404 — no silent fallback.

## Key Conventions

- **Test framework:** Vitest, not Jest. Use `vi.fn()`, `vi.mock()`, etc.
- **Env vars:** `import.meta.env.VITE_*` in browser code, `loadEnv()` in vite.config.ts.
- **Resume source of truth:** `data/input/resume.md` — any text format. `data/adapted/` is auto-generated and should not be edited manually.
- **Resume theme:** `ResumeTheme.tsx` renders any valid JSON Resume document using styled-components. Based on jsonresume-theme-developer-mono. Supports all 12 JSON Resume sections.
- **PDF theme:** `jsonresume-theme-onepage` via `resumed` CLI. Compact single-page layout. Does not render projects section.
- **PDF compat:** Work entries include both `name` and `company` fields — `name` is JSON Resume standard, `company` is what the onepage theme expects.
- **Build pipeline:** `npm run copy-data` syncs `data/adapted/` → `web/public/data/adapted/` before every build/dev start.

## Testing

```bash
cd web
npm test              # Run all unit tests (3 files, 9 tests)
npx vitest run        # Same, non-watch mode
npx playwright test   # E2E tests (requires built site)
```
