# AgentFolio — Architecture

> An open-source agentic portfolio engine that adapts your resume for each visitor's context.

**Stack:** React + styled-components (GitHub Pages) + Python (GitHub Actions) + Claude API
**Infra cost:** $0 (pure GitHub infrastructure, minus LLM API costs)

---

## How It Works

```
User writes:
  data/resume.md          ← any text format
  data/jd/cohere.md       ← paste the JD

GitHub Actions runs:
  adapt_from_markdown.py  ← single LLM call per JD
    → data/adapted/cohere.json    (JSON Resume format)
    → data/adapted/default.json   (generic, no JD context)
    → data/slugs.json             (auto-generated from jd/ filenames)

GitHub Pages serves:
  /           → loads default.json  → renders resume
  /cohere     → loads cohere.json   → renders adapted resume
  /unknown    → 404 page
```

## Data Flow

1. **Input:** `data/resume.md` (freeform) + `data/jd/*.md` (one per target role)
2. **Adaptation:** `scripts/adapt_from_markdown.py` sends resume + JD to Claude in a single call, gets back a complete JSON Resume with tailored summary, reordered sections, and highlighted skills
3. **Output:** `data/adapted/{slug}.json` (JSON Resume format) + `data/slugs.json` (registry)
4. **Rendering:** React SPA loads the adapted JSON and renders it using the developer-mono theme (`ResumeTheme.tsx`), which supports all 12 JSON Resume sections

## Frontend

Minimal React SPA:
- `App.tsx` — routing: parse slug from URL, fetch adaptation, render or 404
- `useVisitorContext` — resolves URL path against `data/slugs.json`
- `useAdaptation` — fetches `data/adapted/{company}.json`
- `ResumeTheme` — renders JSON Resume using styled-components (based on jsonresume-theme-developer-mono)
- `slugResolver` — parses first path segment as slug

No client-side state management, no analytics, no tracking. The frontend is a pure renderer.

## GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `adapt.yml` | push to `data/resume.md` or `data/jd/**` | Generate adapted JSON from markdown |
| `deploy.yml` | push to `main` | Build + deploy to GitHub Pages |
| `analytics.yml` | weekly cron | Aggregate engagement from Issues |
| `jd-sync.yml` | daily cron | Re-fetch JD URLs, refresh keywords |

## Repo Structure

```
agentfolio/
├── data/
│   ├── resume.md              # Source of truth (any text format)
│   ├── jd/                    # Target JDs (filename = URL slug)
│   ├── adapted/               # Generated JSON Resume files
│   └── slugs.json             # Generated slug registry
├── web/
│   ├── src/
│   │   ├── App.tsx            # Routing + rendering
│   │   ├── components/        # ResumeTheme
│   │   ├── hooks/             # useVisitorContext, useAdaptation
│   │   └── utils/             # slugResolver
│   └── e2e/                   # Playwright tests
├── scripts/
│   ├── adapt_from_markdown.py # LLM adaptation pipeline
│   ├── chat_answer.py         # Chat answer generation
│   ├── fetch_jds.py           # JD auto-fetching
│   └── aggregate_feedback.py  # Analytics aggregation
└── .github/workflows/
```
