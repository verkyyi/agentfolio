# AgentFolio — Architecture

> An open-source agentic portfolio engine that detects visitor context and dynamically adapts your resume to match what they're looking for.

**Repo:** github.com/verkyyi/agentfolio
**Live:** verkyyi.github.io/agentfolio
**Stack:** React (GitHub Pages) + Python (GitHub Actions) + LLM APIs
**Infra cost:** $0 (pure GitHub infrastructure)

---

## 1. Design Philosophy

AgentFolio is not a portfolio website. It is an **agent** that serves visitors the most relevant version of you. The site itself is the proof of competence — every visitor experiences the agentic skills you're claiming to have.

### The Five Agentic Behaviors

| Behavior | Action | Proves |
|----------|--------|--------|
| Perceive | Detect who is visiting (URL slug, self-ID) | "I build systems that understand customer context" |
| Reason   | Decide what they care about (match JD, pick profile) | "I build agents that make decisions based on context" |
| Act      | Render adapted resume (reorder, rewrite, highlight) | "I build customer-facing AI that delivers value" |
| Learn    | Track what resonates (clicks, dwell, chat Qs) | "I build systems that improve through data-driven iteration" |
| Explain  | Show how the agent works (debug panel, arch page) | "I design systems that are interpretable and trustworthy" |

---

## 2. System Architecture

The system uses a **hybrid approach**: known target companies get pre-built adaptations (instant load), while unknown companies trigger live generation via GitHub Issues (30-90 second wait with real-time progress).

### 2.1 Scheduled Build (GitHub Actions, known companies)

Triggers: push to `data/resume.json`, weekly schedule, manual.

1. Load base resume + each company profile
2. Adaptation engine: rewrite summary, reorder sections, apply bullet overrides, score skill matches
3. Commit `data/adapted/{company}.json` → Pages auto-deploys

### 2.2 On-Demand Live Generation (Issue-triggered)

Triggers: visitor self-identifies with unknown company.

1. Browser creates GitHub Issue tagged `adapt-request`
2. Action triggers on `issues.opened`, runs full pipeline (fetch JD → match skills → LLM rewrite → commit adapted JSON)
3. Action posts progress comments, then "complete" comment
4. Frontend polls issue comments every 5s, hot-swaps resume when done

### 2.3 Runtime (Browser, client-side)

1. **Context detector:** parses URL slug or prompts for self-ID
2. **Adaptation resolver:** Path A (cached) → instant; Path B (self-ID + cached) → instant; Path C (unknown) → create Issue, poll, hot-swap
3. **Renderer:** section components composed by `adapted.section_order`
4. **Behavior tracker:** client-side event collection, batched to Issues API on session end

### Why hybrid beats either alone

- Your job applications load instantly (pre-built slugs) — no risk
- Casual visitors get the live generation experience — the most impressive demo
- PAT exposure is `issues:write` only — harmless
- LLM costs bounded by rate limiter in Action (10/hour max)
- Every live adaptation gets cached — next visitor loads instantly

---

## 3. Data Models

### 3.1 Base Resume (`data/resume.json`)

Canonical source. Contains: `name`, `contact`, `summary_template` with `{var}` placeholders, `summary_defaults`, `experience[]` (with `bullets[]` containing per-company `adaptations`), `projects[]`, `education[]`, `skills.groups[]`, `volunteering[]`.

Each bullet has `id`, `text`, `tags[]`, and optional `adaptations: { [company_slug]: string | null }`.

### 3.2 Company Profile (`data/companies/{name}.json`)

Defines how the resume adapts for a target company:
- `company`, `role`, `jd_url`, `jd_fetched`
- `priority_tags[]` — tags used to score bullet relevance
- `summary_vars` — overrides for `summary_template` placeholders
- `section_order[]` — renders sections in this order
- `project_order[]` — which project appears first
- `skill_emphasis[]` — highlighted skills in the UI
- `jd_keywords[]` — matched against skills for scoring

### 3.3 Adapted Resume (`data/adapted/{name}.json`)

Generated output. Consumed directly by the React app:
- `summary` — rendered from template + vars
- `section_order` — inherited from profile
- `experience_order` — base order (could be extended in future phases)
- `bullet_overrides` — `{ bullet_id: adapted_text }`
- `project_order`, `skill_emphasis` — from profile
- `match_score` — `{ overall, by_category, matched_keywords, missing_keywords }`

### 3.4 Visitor Context (client-side)

```typescript
interface VisitorContext {
  source: 'slug' | 'self-id';
  slug?: string;
  selfId?: { company: string; role: string };
  company: string;  // normalized
  adaptationStatus: 'cached' | 'generating' | 'ready';
  adaptationProfile: string;
  issueNumber?: number;
}
```

---

## 4. Agent Pipeline

### 4.1 PERCEIVE — Visitor Context Detection

Two inputs: URL slug (`/c/<slug>`) and self-ID form. Slug registry at `data/slugs.json` maps slugs to `{company, role, created, context}`. Self-ID triggers either instant load (cached) or live generation (create Issue, poll).

### 4.2 REASON — Adaptation Engine

Python, runs in GitHub Actions. Steps:
1. Template summary (fill `{vars}` from profile, fall back to defaults)
2. Reorder sections per `company.section_order`
3. Score & reorder bullets by `|bullet.tags ∩ company.priority_tags|`
4. Apply per-company bullet text overrides
5. Score skills (emphasis + keyword match) → `match_score`
6. Reorder projects per `company.project_order`

### 4.3 ACT — Dynamic Rendering

React. Layout:
- Header (name, contact, debug panel)
- Match score bar
- Sections rendered in `adapted.section_order`
- Skills with `data-emphasized` attribute
- Chat widget (Phase 4)
- Footer linking to `/how-it-works` (Phase 5)

### 4.4 LEARN — Feedback Pipeline

**Offline learning loop for you, not real-time dashboard for visitors.** Visitors see only the *result* — a better adapted resume.

Stages: COLLECT (client, per session) → STORE (Issues API on session end) → AGGREGATE (weekly Action) → LEARN (manual review of `data/analytics.json`) → MEASURE (next cycle).

Events: `section_dwell`, `project_click`, `skill_hover`, `chat_question`, `scroll_depth`, `session_duration`, `cta_click`.

### 4.5 EXPLAIN — Architecture Transparency

Three levels:
1. Resume pages: clean, no analytics
2. Debug panel (collapsible): shows context and decisions for this visitor
3. `/how-it-works` page: pipeline diagrams + aggregated stats + side-by-side adaptation comparison

---

## 5. GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `adapt.yml` | push to data, weekly cron, manual | Regenerate adapted JSON for known companies |
| `adapt-on-request.yml` (Phase 2) | `issues.opened` with `adapt-request` label | Live generation for unknown company |
| `jd-sync.yml` (Phase 5) | daily cron | Fetch & cache target JDs |
| `github-stats.yml` (Phase 5) | 6-hourly cron | Pull GitHub activity |
| `analytics.yml` (Phase 3) | weekly Sunday cron | Aggregate feedback from Issues |
| `deploy.yml` | push to main | Build web → GitHub Pages |

---

## 6. Repo Structure

```
agentfolio/
├── .github/workflows/         # CI + deploy
├── scripts/                   # Python adaptation engine
│   ├── adapt_one.py           # Single company adaptation
│   ├── adapt_all.py           # Batch runner
│   └── tests/                 # pytest
├── data/
│   ├── resume.json            # Base resume
│   ├── slugs.json             # URL slug → company
│   ├── companies/             # Company profiles
│   └── adapted/               # Generated per-company JSON
├── web/                       # React + Vite
│   ├── src/
│   │   ├── components/        # Section renderers
│   │   ├── hooks/             # useVisitorContext, useAdaptation
│   │   ├── utils/slugResolver.ts
│   │   └── types.ts
│   └── package.json
└── docs/
    ├── architecture.md        # This document
    └── superpowers/plans/     # Phase implementation plans
```

---

## 7. Security Model

| Token | Scope | Browser? | Risk if stolen |
|-------|-------|----------|----------------|
| GitHub PAT (fine-grained) | `issues:read+write` on this repo | Yes | Spam issues only; no code access, no Actions trigger |
| LLM key (chat widget, Phase 4) | Domain-restricted, spend-capped | Yes | Calls from allowed domain only; monthly cap |
| LLM key (Actions) | Full access | No (GitHub Secret) | Never exposed |
| `GITHUB_TOKEN` (Actions) | Scoped to run | No | Expires immediately |

**Abuse mitigations:**
- Rate limiter in `adapt-on-request.yml`: max 10 requests/hour, excess closed with `rate_limited` label
- Issues require `adapt-request` label to trigger Action — PAT must set it
- Domain-restricted LLM key + monthly spend cap

**Privacy:** No PII stored. Self-ID captures company + role only. No cookies, no fingerprinting, no IP logging. Aggregated analytics only.

---

## 8. Open-Source Strategy

Designed as a **framework** for others to fork:

1. Fork repo
2. Replace `data/resume.json`
3. Add company profiles in `data/companies/`
4. Set LLM API key as GitHub Secret
5. Push → Actions generate adapted versions → Pages deploys

---

## 9. Success Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| Visit → read full resume | Scroll depth > 80% | > 60% of sessions |
| Adaptation engagement | Adapted vs default dwell | Adapted > 1.5x default |
| Live generation completion | % staying until adapted loads | > 70% |
| Live generation latency | Median seconds Issue → complete | < 60s |
| Chat widget usage | Sessions with ≥ 1 question | > 15% |
| Architecture page visits | % of sessions | > 20% (engineers) |
| Contact conversion | Email/LinkedIn/Calendly click rate | > 10% |
| GitHub stars | Repo star count | 50+ in first month |

---

## 10. Implementation Phases

- **Phase 1 (done):** Known-company adaptation via URL slugs. Static pre-built adaptations. See `docs/superpowers/plans/2026-04-15-phase1-known-company-adaptation.md`.
- **Phase 2:** Live generation via Issues. `adapt-on-request.yml`, `useAdaptationProgress`, `AdaptationProgress` component, fine-grained PAT.
- **Phase 3:** Analytics. `useBehaviorTracker`, `aggregate_feedback.py`, `analytics.yml`.
- **Phase 4:** Chat widget with RAG over `resume.json`. Domain-restricted LLM key, client-side rate limit.
- **Phase 5:** `/how-it-works` page. Pipeline diagrams, aggregated stats, adaptation comparison. JD auto-fetch + LLM summary rewriting.
