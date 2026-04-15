# AgentFolio Phase 1: Known-Company Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working adaptive portfolio site that renders per-company resume variants for URL-slug visitors (e.g., `/c/cohere-fde`), built from a Python adaptation engine running in GitHub Actions and deployed to GitHub Pages.

**Architecture:** Python scripts in `scripts/` read a base `data/resume.json` plus per-company profiles from `data/companies/*.json`, then write adapted JSON files to `data/adapted/*.json`. A Vite+React app in `web/` reads the URL slug, fetches the matching adapted JSON, and renders the resume. Two GitHub Actions workflows: `adapt.yml` regenerates adapted JSON on data changes, `deploy.yml` builds the React app to GitHub Pages.

**Tech Stack:**
- Python 3.11 (adaptation engine) — stdlib only + `pytest` for tests
- Vite + React 18 + TypeScript (web app)
- Vitest + React Testing Library (web tests)
- GitHub Actions (CI + deploy)
- GitHub Pages (hosting)

**Out of scope (future phases):** Live generation via Issues, chat widget, analytics pipeline, architecture page, JD auto-sync, LLM-powered summary rewriting (Phase 1 uses template substitution only).

---

## File Structure

**Repository layout after Phase 1:**

```
agentfolio/
├── .github/workflows/
│   ├── adapt.yml              # Regenerate adapted JSON on data changes
│   └── deploy.yml             # Build & deploy web to Pages
├── scripts/
│   ├── adapt_one.py           # Adapt one company: base + profile → adapted JSON
│   ├── adapt_all.py           # Run adapt_one for every file in data/companies/
│   ├── requirements.txt       # pytest only (stdlib otherwise)
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py        # Shared fixtures (sample resume, sample profile)
│       ├── test_adapt_one.py  # Unit tests for adapt_one pure functions
│       └── test_adapt_all.py  # Integration test: run against fixtures
├── data/
│   ├── resume.json            # Canonical base resume (from spec §3.1)
│   ├── slugs.json             # URL slug → company mapping
│   ├── companies/
│   │   ├── default.json       # Fallback profile
│   │   └── cohere.json        # Example profile (from spec §3.2)
│   └── adapted/               # Generated; .gitignore excludes nothing (committed by Action)
│       ├── default.json
│       └── cohere.json
├── web/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── public/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── types.ts                        # AdaptedResume, BaseResume, VisitorContext
│   │   ├── hooks/
│   │   │   ├── useVisitorContext.ts        # Parse URL slug → context
│   │   │   └── useAdaptation.ts            # Fetch adapted JSON by company
│   │   ├── components/
│   │   │   ├── AdaptiveResume.tsx          # Top-level renderer, composes sections
│   │   │   ├── SummarySection.tsx
│   │   │   ├── ExperienceSection.tsx
│   │   │   ├── ProjectsSection.tsx
│   │   │   ├── SkillsSection.tsx
│   │   │   ├── EducationSection.tsx
│   │   │   ├── MatchScoreBar.tsx
│   │   │   └── DebugPanel.tsx              # Collapsible, shows detected context
│   │   └── utils/
│   │       └── slugResolver.ts             # slug → {company, role}
│   └── src/__tests__/
│       ├── useVisitorContext.test.ts
│       ├── useAdaptation.test.ts
│       ├── slugResolver.test.ts
│       └── AdaptiveResume.test.tsx
├── .gitignore
└── README.md
```

**Responsibility boundaries:**

- `scripts/adapt_one.py` — pure transformation: `(base_resume, company_profile) → adapted_resume`. No I/O inside pure functions; a thin CLI wrapper handles files.
- `scripts/adapt_all.py` — orchestration: iterate company profiles, call `adapt_one`, write outputs.
- `web/src/hooks/useVisitorContext.ts` — URL parsing only. No fetching.
- `web/src/hooks/useAdaptation.ts` — fetch adapted JSON by normalized company name. No URL parsing.
- `web/src/components/AdaptiveResume.tsx` — composes section components in the order specified by `adapted.section_order`. Knows nothing about fetching or context detection.
- Section components (`SummarySection`, etc.) — render a single section from adapted data. Dumb presentational components.

---

## Task 1: Initialize repo scaffolding

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `scripts/requirements.txt`

- [ ] **Step 1: Create `.gitignore`**

```
# Python
__pycache__/
*.pyc
.pytest_cache/
.venv/
venv/

# Node
node_modules/
dist/
.vite/
coverage/

# OS
.DS_Store
```

Write to `/home/dev/projects/agentfolio/.gitignore`.

- [ ] **Step 2: Create minimal `README.md`**

```markdown
# AgentFolio

Open-source agentic portfolio engine. Detects visitor context and adapts resume content per company.

See `docs/architecture.md` for design details.

## Status

Phase 1: known-company adaptation via URL slugs. See `docs/superpowers/plans/`.
```

- [ ] **Step 3: Create `scripts/requirements.txt`**

```
pytest==8.3.3
```

- [ ] **Step 4: Commit**

```bash
cd /home/dev/projects/agentfolio
git add .gitignore README.md scripts/requirements.txt
git commit -m "chore: initialize repo scaffolding"
```

---

## Task 2: Seed base resume data

**Files:**
- Create: `data/resume.json`
- Create: `data/slugs.json`
- Create: `data/companies/default.json`
- Create: `data/companies/cohere.json`

- [ ] **Step 1: Create `data/resume.json`**

Copy verbatim from spec §3.1. The full JSON body:

```json
{
  "name": "Lianghui Yi",
  "contact": {
    "location": "Santa Clara, CA",
    "phone": "(925) 900-3467",
    "email": "verky.yi@gmail.com",
    "linkedin": "https://linkedin.com/in/lianghuiyi",
    "github": "https://github.com/verkyyi"
  },
  "summary_template": "Forward Deployed Engineer with 5+ years shipping {focus} at scale. Experienced collaborating directly with enterprise customers to scope technical requirements and deploy end-to-end solutions — from {surface} to {infra}. Proven track record building production {systems} that power 50,000+ users, with deep expertise in {highlight}.",
  "summary_defaults": {
    "focus": "full-stack products and data infrastructure",
    "surface": "front-end interfaces",
    "infra": "backend systems and cloud infrastructure",
    "systems": "AI platforms",
    "highlight": "generative AI engineering, rapid experimentation, and high-quality data solutions"
  },
  "experience": [
    {
      "id": "24helpful",
      "title": "Co-Founder & AI Engineer",
      "company": "24 Helpful, LLC",
      "location": "Santa Clara, CA",
      "dates": "03/2024 – Present",
      "bullets": [
        {
          "id": "24h-evolving-code",
          "text": "Designed and shipped a self-evolving code system (generator/evaluator loop) that accelerated development velocity; implemented CI/CD automation with GitHub Actions to close iteration cycles in under 24 hours.",
          "tags": ["agentic", "ci-cd", "rapid-experimentation", "evaluation"],
          "adaptations": {
            "cohere": "Designed and shipped a self-evolving agentic code system (generator/evaluator loop) that accelerated development velocity; implemented CI/CD automation with GitHub Actions to close iteration cycles in under 24 hours."
          }
        },
        {
          "id": "24h-aws-infra",
          "text": "Delivered end-to-end multi-tenant AWS cloud infrastructure for enterprise customers, reducing provisioning costs by 50% through automated resource management and tenant isolation.",
          "tags": ["cloud", "enterprise", "infrastructure", "customer-facing"],
          "adaptations": {
            "cohere": "Delivered end-to-end multi-tenant cloud infrastructure for enterprise customers, reducing provisioning costs by 50% through automated resource management and tenant isolation across AWS services."
          }
        },
        {
          "id": "24h-customer-collab",
          "text": "Collaborated directly with customers to scope requirements, remove deployment blockers, and accelerate rollouts — codified deployment playbooks and runbooks to standardize operational response across production systems.",
          "tags": ["customer-facing", "deployment", "enterprise", "playbooks"],
          "adaptations": {}
        }
      ]
    },
    {
      "id": "24haowan",
      "title": "Co-Founder & Technical Lead",
      "company": "24Haowan Network Technology Co., Ltd.",
      "location": "Shanghai, China",
      "dates": "10/2019 – 08/2023",
      "bullets": [
        {
          "id": "24hw-saas",
          "text": "Designed a SaaS product and go-to-market strategy that achieved $1,000,000 ARR in 2 years by optimizing product lifecycle, user onboarding, and data-driven iteration loops.",
          "tags": ["product", "growth", "data-driven", "saas"],
          "adaptations": {}
        },
        {
          "id": "24hw-team",
          "text": "Led cross-functional engineering team; built internal tools that streamlined product and engineering workflows, improving team delivery cadence over a 6-month period.",
          "tags": ["leadership", "tooling", "full-stack"],
          "adaptations": {}
        },
        {
          "id": "24hw-enterprise",
          "text": "Engaged directly with enterprise customers to scope technical requirements and uncover pain points, converting 3 strategic accounts within 3 months and improving product-market fit.",
          "tags": ["customer-facing", "enterprise", "product-market-fit"],
          "adaptations": {}
        }
      ]
    },
    {
      "id": "maiduote",
      "title": "Tech Lead",
      "company": "Maiduote Network Technology Co., Ltd.",
      "location": "Guangzhou, China",
      "dates": "06/2018 – 07/2019",
      "subtitle": "Technology subsidiary of a biotech group — doctor-patient engagement platforms",
      "bullets": [
        {
          "id": "mdt-platform",
          "text": "Led end-to-end product development and launched a production platform that increased doctor-patient engagement by 30%; integrated predefined forms and chatbots in collaboration with stakeholders.",
          "tags": ["full-stack", "product", "customer-facing", "healthcare"],
          "adaptations": {
            "cohere": "Led end-to-end product development and launched a production platform that increased doctor-patient engagement by 30%; built and deployed chatbot agents in collaboration with stakeholders to automate patient workflows."
          }
        },
        {
          "id": "mdt-fullstack",
          "text": "Scoped and delivered data-driven features across the full stack, coordinating cross-functional teams to prioritize roadmap items and ensure stable, rapid rollouts.",
          "tags": ["full-stack", "data-driven", "rapid-experimentation"],
          "adaptations": {}
        },
        {
          "id": "mdt-growth",
          "text": "Drove customer-facing growth strategies that acquired over 50,000 users in 6 months, exceeding targets through targeted outreach and workflow optimization.",
          "tags": ["growth", "customer-facing", "scale"],
          "adaptations": {}
        }
      ]
    }
  ],
  "projects": [
    {
      "id": "tokenman",
      "name": "tokenman.io",
      "tagline": "Claude Code Hosting & AI Repo Self-Evolution",
      "url": "https://tokenman.io",
      "github": "https://github.com/verkyyi/tokenman",
      "dates": "03/2026 – Present",
      "tags": ["agentic", "infrastructure", "ci-cd", "saas"],
      "bullets": [
        { "id": "tkm-hosting", "text": "Built terminal.tokenman.io — a multi-tenant Claude Code CLI hosting SaaS on EC2 with mobile-first SSH, persistent tmux sessions, and cloud-init provisioning for secure production access.", "tags": ["infrastructure", "cloud", "saas"] },
        { "id": "tkm-evolution", "text": "Designed a skill-based repo self-evolution system with shared AI context and slash commands, enabling autonomous AI-driven code loops via GitHub Actions (human + AI and headless generator/evaluator workflows).", "tags": ["agentic", "evaluation", "ci-cd", "autonomous"] }
      ]
    },
    {
      "id": "ainbox",
      "name": "aInbox (ainbox.io)",
      "tagline": "MCP-Native AI Agent Email Middleware",
      "url": "https://ainbox.io",
      "github": "https://github.com/verkyyi/ainbox",
      "dates": "12/2025 – Present",
      "tags": ["agentic", "mcp", "llm", "infrastructure"],
      "bullets": [
        { "id": "ainbox-platform", "text": "Built an MCP-native AI agent middleware platform giving LLMs a dedicated inbox and async messaging layer, operated entirely via Model Context Protocol tools with no traditional UI.", "tags": ["agentic", "mcp", "llm"] },
        { "id": "ainbox-infra", "text": "Designed full server architecture with OAuth, JWT, and Streamable HTTP transport; implemented LLM-driven triage and labeling pipeline deployed on multi-tenant AWS infrastructure using Aurora Serverless, SES, and per-user IAM roles.", "tags": ["infrastructure", "cloud", "llm", "enterprise"] }
      ]
    },
    {
      "id": "agentfolio",
      "name": "AgentFolio",
      "tagline": "Open-Source Agentic Portfolio Engine",
      "url": "https://verkyyi.github.io/agentfolio",
      "github": "https://github.com/verkyyi/agentfolio",
      "dates": "04/2026 – Present",
      "tags": ["agentic", "rag", "full-stack", "open-source"],
      "bullets": [
        { "id": "af-engine", "text": "Built an agentic portfolio engine that detects visitor context and dynamically adapts resume content using LLM-powered rewriting and JD-matching pipelines; deployed on pure GitHub infrastructure with zero third-party cost.", "tags": ["agentic", "llm", "infrastructure"] },
        { "id": "af-architecture", "text": "Designed a five-stage agent architecture (perceive → reason → act → learn → explain) with RAG-powered chat, automated JD fetching, and visitor feedback loops that continuously optimize content resonance.", "tags": ["agentic", "rag", "evaluation", "data-driven"] }
      ]
    }
  ],
  "education": [
    { "degree": "Master of Data Science and Analytics", "school": "Georgetown University", "location": "Washington, DC", "dates": "09/2023 – 05/2025", "note": "Returning Student Scholarship (Top 3%)" },
    { "degree": "Executive MBA", "school": "Lingnan College, Sun Yat-Sen University", "location": "Guangzhou, China", "dates": "" },
    { "degree": "B.E. in Information Engineering", "school": "Beijing University of Posts and Telecommunications", "location": "Beijing, China", "dates": "" }
  ],
  "skills": {
    "groups": [
      { "id": "ai", "label": "AI & Agentic Systems", "items": ["Autonomous Agent Development", "LLM Integration", "RAG Pipelines", "MCP (Model Context Protocol)", "Prompt Engineering", "RLHF Concepts", "Evaluation Framework Design (Generator/Evaluator)", "Data Pipeline Architecture"] },
      { "id": "fullstack", "label": "Full-Stack", "items": ["Python", "JavaScript/TypeScript (Node.js, React.js)", "R", "SQL", "PHP", "HTML/CSS", "PySpark", "NumPy", "Pandas"] },
      { "id": "cloud", "label": "Cloud & Infrastructure", "items": ["AWS (EC2, SES, Aurora Serverless, IAM, SCPs)", "Docker", "Kubernetes", "GitHub Actions CI/CD", "Private/Hybrid Cloud Deployment", "JWT/OAuth", "Production Systems", "Distributed Systems"] },
      { "id": "methods", "label": "Methods & Tools", "items": ["Rapid Experimentation", "Customer Discovery", "Scrum/Agile", "Playbooks/Runbooks", "Figma", "Jira", "MySQL", "Redis"] }
    ]
  },
  "volunteering": [
    { "title": "Volunteer Lead", "org": "1124 Space", "location": "Arlington, VA", "dates": "04/2024 – 12/2025", "description": "Led community initiatives and organized weekly founder-focused events (1,000+ participants in one year), coordinated volunteers and facilitated connections to strengthen engagement and collaboration." }
  ]
}
```

- [ ] **Step 2: Create `data/slugs.json`**

```json
{
  "cohere-fde": { "company": "cohere", "role": "FDE, Agentic Platform", "created": "2026-04-15", "context": "Applied via Ashby" },
  "general": { "company": "default", "role": null, "created": "2026-04-15", "context": "LinkedIn profile link" }
}
```

- [ ] **Step 3: Create `data/companies/default.json`**

```json
{
  "company": "default",
  "role": null,
  "priority_tags": ["full-stack", "agentic", "customer-facing"],
  "summary_vars": {
    "focus": "full-stack products and data infrastructure",
    "surface": "front-end interfaces",
    "infra": "backend systems and cloud infrastructure",
    "systems": "AI platforms",
    "highlight": "generative AI engineering, rapid experimentation, and high-quality data solutions"
  },
  "section_order": ["summary", "experience", "projects", "skills", "education", "volunteering"],
  "project_order": ["ainbox", "agentfolio", "tokenman"],
  "skill_emphasis": ["Python", "LLM Integration", "AWS (EC2, SES, Aurora Serverless, IAM, SCPs)"],
  "jd_keywords": []
}
```

- [ ] **Step 4: Create `data/companies/cohere.json`**

Copy verbatim from spec §3.2:

```json
{
  "company": "Cohere",
  "role": "FDE, Agentic Platform",
  "jd_url": "https://jobs.ashbyhq.com/cohere/b0bcef37-...",
  "jd_fetched": "2026-04-14",
  "priority_tags": ["agentic", "customer-facing", "rag", "cloud", "enterprise"],
  "summary_vars": {
    "focus": "agentic AI systems and full-stack products",
    "surface": "autonomous agents and backend systems",
    "infra": "private cloud infrastructure",
    "systems": "AI platforms",
    "highlight": "LLM integration, RAG pipelines, and rapid experimentation across the entire product lifecycle"
  },
  "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
  "project_order": ["agentfolio", "ainbox", "tokenman"],
  "skill_emphasis": ["Autonomous Agent Development", "RAG Pipelines", "Python", "MCP (Model Context Protocol)", "LLM Integration"],
  "jd_keywords": ["agentic", "agents", "RAG", "Python", "enterprise", "North platform", "private cloud", "customer", "deploy", "production", "scalability"]
}
```

- [ ] **Step 5: Verify JSON validity**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -c "import json; [json.load(open(f)) for f in ['data/resume.json','data/slugs.json','data/companies/default.json','data/companies/cohere.json']]; print('ok')"
```
Expected output: `ok`

- [ ] **Step 6: Commit**

```bash
git add data/
git commit -m "feat(data): seed base resume, slug registry, and company profiles"
```

---

## Task 3: Write failing tests for `adapt_one` pure functions

**Files:**
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/conftest.py`
- Create: `scripts/tests/test_adapt_one.py`

- [ ] **Step 1: Create `scripts/tests/__init__.py`** (empty file)

```python
```

- [ ] **Step 2: Create `scripts/tests/conftest.py`**

```python
import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def base_resume():
    return json.loads((REPO_ROOT / "data" / "resume.json").read_text())


@pytest.fixture
def cohere_profile():
    return json.loads((REPO_ROOT / "data" / "companies" / "cohere.json").read_text())


@pytest.fixture
def default_profile():
    return json.loads((REPO_ROOT / "data" / "companies" / "default.json").read_text())
```

- [ ] **Step 3: Create `scripts/tests/test_adapt_one.py`**

```python
import pytest

from scripts.adapt_one import (
    render_summary,
    pick_bullet_text,
    score_bullet_relevance,
    order_experience_bullets,
    score_skill_match,
    adapt,
)


def test_render_summary_fills_template(base_resume, cohere_profile):
    result = render_summary(base_resume, cohere_profile)
    assert "agentic AI systems and full-stack products" in result
    assert "{focus}" not in result
    assert "{surface}" not in result


def test_render_summary_uses_defaults_when_profile_has_no_vars(base_resume):
    profile = {"summary_vars": {}}
    result = render_summary(base_resume, profile)
    assert "full-stack products and data infrastructure" in result


def test_pick_bullet_text_prefers_company_adaptation(cohere_profile):
    bullet = {
        "text": "original",
        "adaptations": {"cohere": "cohere-specific"},
    }
    assert pick_bullet_text(bullet, "cohere") == "cohere-specific"


def test_pick_bullet_text_falls_back_to_base_when_adaptation_null():
    bullet = {"text": "original", "adaptations": {"cohere": None}}
    assert pick_bullet_text(bullet, "cohere") == "original"


def test_pick_bullet_text_falls_back_to_base_when_no_adaptation():
    bullet = {"text": "original", "adaptations": {}}
    assert pick_bullet_text(bullet, "cohere") == "original"


def test_score_bullet_relevance_counts_tag_overlap():
    bullet = {"tags": ["agentic", "ci-cd", "evaluation"]}
    priority = ["agentic", "rag", "cloud", "evaluation"]
    assert score_bullet_relevance(bullet, priority) == 2


def test_score_bullet_relevance_handles_missing_tags():
    assert score_bullet_relevance({}, ["agentic"]) == 0


def test_order_experience_bullets_sorts_by_relevance_stable():
    bullets = [
        {"id": "a", "tags": ["cloud"]},
        {"id": "b", "tags": ["agentic", "rag"]},
        {"id": "c", "tags": ["agentic"]},
    ]
    priority = ["agentic", "rag"]
    ordered = order_experience_bullets(bullets, priority)
    assert [b["id"] for b in ordered] == ["b", "c", "a"]


def test_score_skill_match_counts_emphasis_and_keywords(cohere_profile):
    score = score_skill_match(
        ["Python", "RAG Pipelines", "Kubernetes"],
        cohere_profile,
    )
    assert score == 2  # Python and RAG Pipelines match; Kubernetes does not


def test_adapt_returns_expected_shape(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert set(result.keys()) >= {
        "company",
        "generated_at",
        "generated_by",
        "summary",
        "section_order",
        "experience_order",
        "bullet_overrides",
        "project_order",
        "skill_emphasis",
        "match_score",
    }


def test_adapt_applies_cohere_bullet_override(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    override = result["bullet_overrides"].get("24h-evolving-code")
    assert override is not None
    assert "agentic" in override


def test_adapt_orders_projects_per_profile(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert result["project_order"] == ["agentfolio", "ainbox", "tokenman"]


def test_adapt_match_score_has_per_category(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    ms = result["match_score"]
    assert 0.0 <= ms["overall"] <= 1.0
    assert set(ms["by_category"].keys()) == {"ai", "fullstack", "cloud", "methods"}
    for v in ms["by_category"].values():
        assert 0.0 <= v <= 1.0
```

- [ ] **Step 4: Run tests to verify they fail**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m pip install --user -r scripts/requirements.txt
python3 -m pytest scripts/tests/test_adapt_one.py -v
```
Expected: ALL FAIL with `ModuleNotFoundError: No module named 'scripts.adapt_one'`.

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/
git commit -m "test(adapt): add failing unit tests for adapt_one pure functions"
```

---

## Task 4: Implement `adapt_one.py`

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/adapt_one.py`

- [ ] **Step 1: Create `scripts/__init__.py`** (empty file, makes `scripts` importable)

```python
```

- [ ] **Step 2: Create `scripts/adapt_one.py`**

```python
"""Adapt a base resume for a single company profile.

Pure functions (testable) + thin CLI wrapper.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "adapt_one.py v0.1"


def render_summary(base_resume: dict, profile: dict) -> str:
    template: str = base_resume["summary_template"]
    defaults: dict[str, str] = base_resume.get("summary_defaults", {})
    overrides: dict[str, str] = profile.get("summary_vars", {}) or {}
    merged = {**defaults, **{k: v for k, v in overrides.items() if v}}
    return template.format(**merged)


def pick_bullet_text(bullet: dict, company_slug: str) -> str:
    adaptations = bullet.get("adaptations") or {}
    override = adaptations.get(company_slug)
    if override:
        return override
    return bullet["text"]


def score_bullet_relevance(bullet: dict, priority_tags: list[str]) -> int:
    tags = set(bullet.get("tags") or [])
    return len(tags.intersection(priority_tags))


def order_experience_bullets(
    bullets: list[dict], priority_tags: list[str]
) -> list[dict]:
    indexed = list(enumerate(bullets))
    indexed.sort(
        key=lambda pair: (
            -score_bullet_relevance(pair[1], priority_tags),
            pair[0],
        )
    )
    return [b for _, b in indexed]


def score_skill_match(skill_items: list[str], profile: dict) -> int:
    emphasis = set(profile.get("skill_emphasis") or [])
    keywords = [k.lower() for k in (profile.get("jd_keywords") or [])]
    count = 0
    for item in skill_items:
        if item in emphasis:
            count += 1
            continue
        lowered = item.lower()
        if any(kw in lowered for kw in keywords):
            count += 1
    return count


def _normalize_company(profile: dict) -> str:
    return str(profile.get("company", "default")).strip().lower().replace(" ", "-")


def _match_score(base_resume: dict, profile: dict) -> dict:
    groups = base_resume["skills"]["groups"]
    by_category: dict[str, float] = {}
    total_matched = 0
    total_items = 0
    matched_keywords: set[str] = set()
    emphasis = set(profile.get("skill_emphasis") or [])
    keywords = [k.lower() for k in (profile.get("jd_keywords") or [])]

    for group in groups:
        items = group["items"]
        matched = score_skill_match(items, profile)
        by_category[group["id"]] = round(matched / len(items), 2) if items else 0.0
        total_matched += matched
        total_items += len(items)
        for item in items:
            if item in emphasis:
                matched_keywords.add(item)
            else:
                lowered = item.lower()
                for kw in keywords:
                    if kw in lowered:
                        matched_keywords.add(kw)

    overall = round(total_matched / total_items, 2) if total_items else 0.0
    profile_keywords = set(profile.get("jd_keywords") or [])
    missing = sorted(profile_keywords - {k for k in matched_keywords})
    return {
        "overall": overall,
        "by_category": by_category,
        "matched_keywords": sorted(matched_keywords),
        "missing_keywords": missing,
    }


def adapt(base_resume: dict, profile: dict) -> dict:
    company_slug = _normalize_company(profile)
    priority = profile.get("priority_tags") or []

    summary = render_summary(base_resume, profile)

    experience_order = [exp["id"] for exp in base_resume["experience"]]

    bullet_overrides: dict[str, str] = {}
    for exp in base_resume["experience"]:
        for bullet in exp["bullets"]:
            picked = pick_bullet_text(bullet, company_slug)
            if picked != bullet["text"]:
                bullet_overrides[bullet["id"]] = picked

    project_order = profile.get("project_order") or [
        p["id"] for p in base_resume["projects"]
    ]
    section_order = profile.get("section_order") or [
        "summary",
        "experience",
        "projects",
        "skills",
        "education",
        "volunteering",
    ]
    skill_emphasis = profile.get("skill_emphasis") or []

    return {
        "company": profile.get("company", "default"),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generated_by": VERSION,
        "summary": summary,
        "section_order": section_order,
        "experience_order": experience_order,
        "bullet_overrides": bullet_overrides,
        "project_order": project_order,
        "skill_emphasis": skill_emphasis,
        "match_score": _match_score(base_resume, profile),
    }


def _load(path: Path) -> Any:
    return json.loads(path.read_text())


def _write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Adapt base resume for one company.")
    parser.add_argument("company_slug", help="Filename stem in data/companies/")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to repo root (default: auto-detected)",
    )
    args = parser.parse_args(argv)

    root = Path(args.repo_root)
    base = _load(root / "data" / "resume.json")
    profile_path = root / "data" / "companies" / f"{args.company_slug}.json"
    if not profile_path.exists():
        print(f"error: profile not found: {profile_path}", file=sys.stderr)
        return 2
    profile = _load(profile_path)

    adapted = adapt(base, profile)
    output_slug = _normalize_company(profile)
    out_path = root / "data" / "adapted" / f"{output_slug}.json"
    _write(out_path, adapted)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 3: Run tests to verify they pass**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/test_adapt_one.py -v
```
Expected: ALL PASS (12 tests).

- [ ] **Step 4: Run the CLI to produce a real adapted file**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m scripts.adapt_one cohere
python3 -m scripts.adapt_one default
```
Expected output (two lines):
```
wrote .../data/adapted/cohere.json
wrote .../data/adapted/default.json
```

Then verify:
```bash
python3 -c "import json; d=json.load(open('data/adapted/cohere.json')); print(d['section_order']); print(d['project_order']); print(d['match_score']['overall'])"
```
Expected: `section_order` has `projects` before `experience`, `project_order` starts with `agentfolio`, overall is a float between 0 and 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py scripts/adapt_one.py data/adapted/
git commit -m "feat(adapt): implement adapt_one transformation engine"
```

---

## Task 5: Implement `adapt_all.py` with integration test

**Files:**
- Create: `scripts/tests/test_adapt_all.py`
- Create: `scripts/adapt_all.py`

- [ ] **Step 1: Write failing integration test `scripts/tests/test_adapt_all.py`**

```python
import json
from pathlib import Path

from scripts.adapt_all import run

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_run_generates_one_file_per_profile(tmp_path):
    # Mirror repo structure in tmp
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)

    # Copy real base resume
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    # Write two minimal profiles
    (tmp_path / "data" / "companies" / "alpha.json").write_text(json.dumps({
        "company": "Alpha", "priority_tags": [], "summary_vars": {},
        "section_order": ["summary"], "project_order": [],
        "skill_emphasis": [], "jd_keywords": []
    }))
    (tmp_path / "data" / "companies" / "beta.json").write_text(json.dumps({
        "company": "Beta", "priority_tags": [], "summary_vars": {},
        "section_order": ["summary"], "project_order": [],
        "skill_emphasis": [], "jd_keywords": []
    }))

    written = run(repo_root=tmp_path)

    assert sorted(p.name for p in written) == ["alpha.json", "beta.json"]
    assert (tmp_path / "data" / "adapted" / "alpha.json").exists()
    assert (tmp_path / "data" / "adapted" / "beta.json").exists()


def test_run_against_real_repo_produces_cohere_and_default():
    written = run(repo_root=REPO_ROOT)
    names = {p.name for p in written}
    assert "cohere.json" in names
    assert "default.json" in names
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/test_adapt_all.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.adapt_all'`.

- [ ] **Step 3: Implement `scripts/adapt_all.py`**

```python
"""Run adapt_one for every profile in data/companies/."""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.adapt_one import _load, _normalize_company, _write, adapt


def run(repo_root: Path) -> list[Path]:
    base = _load(repo_root / "data" / "resume.json")
    companies_dir = repo_root / "data" / "companies"
    adapted_dir = repo_root / "data" / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for profile_path in sorted(companies_dir.glob("*.json")):
        profile = _load(profile_path)
        result = adapt(base, profile)
        out_path = adapted_dir / f"{_normalize_company(profile)}.json"
        _write(out_path, result)
        written.append(out_path)
        print(f"wrote {out_path}")
    return written


def main() -> int:
    run(Path(__file__).resolve().parents[1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/ -v
```
Expected: ALL PASS (14 tests: 12 unit + 2 integration).

- [ ] **Step 5: Run the CLI**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m scripts.adapt_all
```
Expected: prints `wrote data/adapted/cohere.json` and `wrote data/adapted/default.json`.

- [ ] **Step 6: Commit**

```bash
git add scripts/adapt_all.py scripts/tests/test_adapt_all.py data/adapted/
git commit -m "feat(adapt): add adapt_all batch runner with integration test"
```

---

## Task 6: Scaffold Vite + React + TypeScript web app

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/tsconfig.node.json`
- Create: `web/vite.config.ts`
- Create: `web/vitest.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/vite-env.d.ts`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "agentfolio-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.3"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/agentfolio/',
});
```

- [ ] **Step 5: Create `web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 6: Create `web/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Create `web/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create `web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lianghui Yi — AgentFolio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `web/src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 10: Create placeholder `web/src/App.tsx`**

```typescript
export default function App() {
  return <main>loading…</main>;
}
```

- [ ] **Step 11: Install dependencies**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm install
```
Expected: exits 0, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 12: Verify build**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm run build
```
Expected: completes successfully, writes to `dist/`.

- [ ] **Step 13: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/package.json web/package-lock.json web/tsconfig.json web/tsconfig.node.json web/vite.config.ts web/vitest.config.ts web/index.html web/src/
git commit -m "feat(web): scaffold Vite + React + TypeScript app"
```

---

## Task 7: Type definitions for adapted resume and context

**Files:**
- Create: `web/src/types.ts`

- [ ] **Step 1: Create `web/src/types.ts`**

```typescript
export interface Contact {
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface Bullet {
  id: string;
  text: string;
  tags?: string[];
  adaptations?: Record<string, string | null>;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  dates: string;
  subtitle?: string;
  bullets: Bullet[];
}

export interface Project {
  id: string;
  name: string;
  tagline: string;
  url: string;
  github: string;
  dates: string;
  tags: string[];
  bullets: Bullet[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  dates: string;
  note?: string;
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface Volunteering {
  title: string;
  org: string;
  location: string;
  dates: string;
  description: string;
}

export interface BaseResume {
  name: string;
  contact: Contact;
  summary_template: string;
  summary_defaults: Record<string, string>;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  skills: { groups: SkillGroup[] };
  volunteering: Volunteering[];
}

export interface MatchScore {
  overall: number;
  by_category: Record<string, number>;
  matched_keywords: string[];
  missing_keywords: string[];
}

export type SectionName =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'volunteering';

export interface AdaptedResume {
  company: string;
  generated_at: string;
  generated_by: string;
  summary: string;
  section_order: SectionName[];
  experience_order: string[];
  bullet_overrides: Record<string, string>;
  project_order: string[];
  skill_emphasis: string[];
  match_score: MatchScore;
}

export interface SlugEntry {
  company: string;
  role: string | null;
  created: string;
  context: string;
}

export type SlugRegistry = Record<string, SlugEntry>;

export interface VisitorContext {
  source: 'slug' | 'default';
  slug?: string;
  company: string;
  role: string | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npx tsc --noEmit
```
Expected: exits 0 (no output).

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/types.ts
git commit -m "feat(web): add shared type definitions"
```

---

## Task 8: `slugResolver` with tests

**Files:**
- Create: `web/src/__tests__/slugResolver.test.ts`
- Create: `web/src/utils/slugResolver.ts`

- [ ] **Step 1: Write failing test `web/src/__tests__/slugResolver.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveSlug, parseSlugFromPath } from '../utils/slugResolver';
import type { SlugRegistry } from '../types';

const registry: SlugRegistry = {
  'cohere-fde': {
    company: 'cohere',
    role: 'FDE, Agentic Platform',
    created: '2026-04-15',
    context: 'Applied via Ashby',
  },
  general: {
    company: 'default',
    role: null,
    created: '2026-04-15',
    context: 'LinkedIn',
  },
};

describe('parseSlugFromPath', () => {
  it('extracts slug from /c/<slug>', () => {
    expect(parseSlugFromPath('/agentfolio/c/cohere-fde')).toBe('cohere-fde');
    expect(parseSlugFromPath('/c/cohere-fde')).toBe('cohere-fde');
  });

  it('returns null when no slug segment', () => {
    expect(parseSlugFromPath('/agentfolio/')).toBeNull();
    expect(parseSlugFromPath('/')).toBeNull();
    expect(parseSlugFromPath('/c/')).toBeNull();
  });

  it('ignores extra path segments after slug', () => {
    expect(parseSlugFromPath('/c/cohere-fde/something')).toBe('cohere-fde');
  });
});

describe('resolveSlug', () => {
  it('returns slug-based context when slug exists in registry', () => {
    const ctx = resolveSlug('cohere-fde', registry);
    expect(ctx).toEqual({
      source: 'slug',
      slug: 'cohere-fde',
      company: 'cohere',
      role: 'FDE, Agentic Platform',
    });
  });

  it('falls back to default when slug is null', () => {
    const ctx = resolveSlug(null, registry);
    expect(ctx).toEqual({
      source: 'default',
      company: 'default',
      role: null,
    });
  });

  it('falls back to default when slug is not in registry', () => {
    const ctx = resolveSlug('unknown-slug', registry);
    expect(ctx.source).toBe('default');
    expect(ctx.company).toBe('default');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- slugResolver
```
Expected: FAIL — cannot resolve `../utils/slugResolver`.

- [ ] **Step 3: Implement `web/src/utils/slugResolver.ts`**

```typescript
import type { SlugRegistry, VisitorContext } from '../types';

export function parseSlugFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const cIdx = parts.indexOf('c');
  if (cIdx === -1 || cIdx + 1 >= parts.length) return null;
  const slug = parts[cIdx + 1];
  return slug || null;
}

export function resolveSlug(
  slug: string | null,
  registry: SlugRegistry,
): VisitorContext {
  if (slug && registry[slug]) {
    const entry = registry[slug];
    return {
      source: 'slug',
      slug,
      company: entry.company,
      role: entry.role,
    };
  }
  return {
    source: 'default',
    company: 'default',
    role: null,
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- slugResolver
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/utils/ web/src/__tests__/slugResolver.test.ts
git commit -m "feat(web): add slug resolver with tests"
```

---

## Task 9: `useVisitorContext` hook with tests

**Files:**
- Create: `web/src/__tests__/useVisitorContext.test.ts`
- Create: `web/src/hooks/useVisitorContext.ts`

- [ ] **Step 1: Write failing test `web/src/__tests__/useVisitorContext.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorContext } from '../hooks/useVisitorContext';

const registry = {
  'cohere-fde': {
    company: 'cohere',
    role: 'FDE, Agentic Platform',
    created: '2026-04-15',
    context: 'Applied via Ashby',
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => registry,
  })));
});

describe('useVisitorContext', () => {
  it('returns default context when path has no slug', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/agentfolio/' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'default',
      company: 'default',
    });
  });

  it('resolves slug from URL path against the registry', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/agentfolio/c/cohere-fde' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'slug',
      slug: 'cohere-fde',
      company: 'cohere',
      role: 'FDE, Agentic Platform',
    });
  });

  it('falls back to default when slug is unknown', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/c/not-a-real-slug' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context?.source).toBe('default');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- useVisitorContext
```
Expected: FAIL — cannot resolve `../hooks/useVisitorContext`.

- [ ] **Step 3: Implement `web/src/hooks/useVisitorContext.ts`**

```typescript
import { useEffect, useState } from 'react';
import type { SlugRegistry, VisitorContext } from '../types';
import { parseSlugFromPath, resolveSlug } from '../utils/slugResolver';

interface Options {
  pathname?: string;
  slugsUrl?: string;
}

export function useVisitorContext(options: Options = {}) {
  const [context, setContext] = useState<VisitorContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pathname = options.pathname ?? window.location.pathname;
  const slugsUrl = options.slugsUrl ?? `${import.meta.env.BASE_URL}data/slugs.json`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(slugsUrl);
        if (!res.ok) throw new Error(`slugs fetch failed: ${res.status}`);
        const registry = (await res.json()) as SlugRegistry;
        if (cancelled) return;
        const slug = parseSlugFromPath(pathname);
        setContext(resolveSlug(slug, registry));
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
        setContext({ source: 'default', company: 'default', role: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, slugsUrl]);

  return { context, error };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- useVisitorContext
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/hooks/useVisitorContext.ts web/src/__tests__/useVisitorContext.test.ts
git commit -m "feat(web): add useVisitorContext hook"
```

---

## Task 10: `useAdaptation` hook with tests

**Files:**
- Create: `web/src/__tests__/useAdaptation.test.ts`
- Create: `web/src/hooks/useAdaptation.ts`

- [ ] **Step 1: Write failing test `web/src/__tests__/useAdaptation.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdaptation } from '../hooks/useAdaptation';
import type { AdaptedResume, BaseResume } from '../types';

const baseResume: BaseResume = {
  name: 'Test User',
  contact: {
    location: 'X',
    phone: '',
    email: 'x@y.z',
    linkedin: '',
    github: '',
  },
  summary_template: 'ignored',
  summary_defaults: {},
  experience: [],
  projects: [],
  education: [],
  skills: { groups: [] },
  volunteering: [],
};

const adapted: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Adapted summary',
  section_order: ['summary', 'experience', 'projects', 'skills', 'education', 'volunteering'],
  experience_order: [],
  bullet_overrides: {},
  project_order: [],
  skill_emphasis: [],
  match_score: {
    overall: 0.5,
    by_category: {},
    matched_keywords: [],
    missing_keywords: [],
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/data/resume.json')) {
      return Promise.resolve({ ok: true, json: async () => baseResume });
    }
    if (url.includes('/data/adapted/cohere.json')) {
      return Promise.resolve({ ok: true, json: async () => adapted });
    }
    if (url.includes('/data/adapted/default.json')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...adapted, company: 'Default' }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

describe('useAdaptation', () => {
  it('returns null until company is provided', () => {
    const { result } = renderHook(() => useAdaptation(null));
    expect(result.current.adapted).toBeNull();
    expect(result.current.base).toBeNull();
  });

  it('fetches base resume and adapted JSON for company', async () => {
    const { result } = renderHook(() => useAdaptation('cohere'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.company).toBe('Cohere');
    expect(result.current.base?.name).toBe('Test User');
  });

  it('falls back to default when adapted file is 404', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.company).toBe('Default');
  });

  it('normalizes company name to lowercase-dashed', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    renderHook(() => useAdaptation('Cohere AI'));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('/data/adapted/cohere-ai.json'))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptation
```
Expected: FAIL — cannot resolve `../hooks/useAdaptation`.

- [ ] **Step 3: Implement `web/src/hooks/useAdaptation.ts`**

```typescript
import { useEffect, useState } from 'react';
import type { AdaptedResume, BaseResume } from '../types';

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useAdaptation(company: string | null) {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [base, setBase] = useState<BaseResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const baseUrl = `${import.meta.env.BASE_URL}data/resume.json`;
    const slug = normalize(company);

    (async () => {
      try {
        const baseRes = await fetch(baseUrl);
        if (!baseRes.ok) throw new Error(`base resume fetch: ${baseRes.status}`);
        const baseData = (await baseRes.json()) as BaseResume;

        const primaryUrl = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        let adaptedRes = await fetch(primaryUrl);
        if (!adaptedRes.ok) {
          const fallbackUrl = `${import.meta.env.BASE_URL}data/adapted/default.json`;
          adaptedRes = await fetch(fallbackUrl);
          if (!adaptedRes.ok) {
            throw new Error(`no adaptation available for ${slug} or default`);
          }
        }
        const adaptedData = (await adaptedRes.json()) as AdaptedResume;

        if (cancelled) return;
        setBase(baseData);
        setAdapted(adaptedData);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company]);

  return { adapted, base, error };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptation
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/hooks/useAdaptation.ts web/src/__tests__/useAdaptation.test.ts
git commit -m "feat(web): add useAdaptation hook with default fallback"
```

---

## Task 11: Section components (presentational)

**Files:**
- Create: `web/src/components/SummarySection.tsx`
- Create: `web/src/components/ExperienceSection.tsx`
- Create: `web/src/components/ProjectsSection.tsx`
- Create: `web/src/components/SkillsSection.tsx`
- Create: `web/src/components/EducationSection.tsx`
- Create: `web/src/components/VolunteeringSection.tsx`
- Create: `web/src/components/MatchScoreBar.tsx`
- Create: `web/src/components/DebugPanel.tsx`

These components are pure presentational — they receive props and render. No tests at this level (they're covered by the `AdaptiveResume` integration test in Task 12). Keep them short.

- [ ] **Step 1: Create `web/src/components/SummarySection.tsx`**

```typescript
interface Props {
  summary: string;
}

export function SummarySection({ summary }: Props) {
  return (
    <section aria-label="Summary">
      <h2>Summary</h2>
      <p>{summary}</p>
    </section>
  );
}
```

- [ ] **Step 2: Create `web/src/components/ExperienceSection.tsx`**

```typescript
import type { Experience } from '../types';

interface Props {
  experience: Experience[];
  order: string[];
  bulletOverrides: Record<string, string>;
}

export function ExperienceSection({ experience, order, bulletOverrides }: Props) {
  const byId = new Map(experience.map((e) => [e.id, e]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Experience[];

  return (
    <section aria-label="Experience">
      <h2>Experience</h2>
      {ordered.map((exp) => (
        <article key={exp.id}>
          <header>
            <h3>
              {exp.title} · {exp.company}
            </h3>
            <p>
              {exp.location} · {exp.dates}
            </p>
            {exp.subtitle && <p>{exp.subtitle}</p>}
          </header>
          <ul>
            {exp.bullets.map((b) => (
              <li key={b.id}>{bulletOverrides[b.id] ?? b.text}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Create `web/src/components/ProjectsSection.tsx`**

```typescript
import type { Project } from '../types';

interface Props {
  projects: Project[];
  order: string[];
}

export function ProjectsSection({ projects, order }: Props) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Project[];

  return (
    <section aria-label="Projects">
      <h2>Projects</h2>
      {ordered.map((p) => (
        <article key={p.id}>
          <header>
            <h3>
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.name}
              </a>
            </h3>
            <p>
              {p.tagline} · {p.dates}
            </p>
          </header>
          <ul>
            {p.bullets.map((b) => (
              <li key={b.id}>{b.text}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Create `web/src/components/SkillsSection.tsx`**

```typescript
import type { SkillGroup } from '../types';

interface Props {
  groups: SkillGroup[];
  emphasis: string[];
}

export function SkillsSection({ groups, emphasis }: Props) {
  const emphasisSet = new Set(emphasis);
  return (
    <section aria-label="Skills">
      <h2>Skills</h2>
      {groups.map((g) => (
        <div key={g.id}>
          <h3>{g.label}</h3>
          <ul>
            {g.items.map((item) => (
              <li
                key={item}
                data-emphasized={emphasisSet.has(item) ? 'true' : 'false'}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Create `web/src/components/EducationSection.tsx`**

```typescript
import type { Education } from '../types';

interface Props {
  education: Education[];
}

export function EducationSection({ education }: Props) {
  return (
    <section aria-label="Education">
      <h2>Education</h2>
      <ul>
        {education.map((e) => (
          <li key={`${e.school}-${e.degree}`}>
            <strong>{e.degree}</strong> — {e.school}
            {e.location && ` · ${e.location}`}
            {e.dates && ` · ${e.dates}`}
            {e.note && ` · ${e.note}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Create `web/src/components/VolunteeringSection.tsx`**

```typescript
import type { Volunteering } from '../types';

interface Props {
  items: Volunteering[];
}

export function VolunteeringSection({ items }: Props) {
  return (
    <section aria-label="Volunteering">
      <h2>Volunteering</h2>
      <ul>
        {items.map((v) => (
          <li key={`${v.org}-${v.title}`}>
            <strong>{v.title}</strong> · {v.org} · {v.dates}
            <p>{v.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7: Create `web/src/components/MatchScoreBar.tsx`**

```typescript
import type { MatchScore } from '../types';

interface Props {
  score: MatchScore;
}

export function MatchScoreBar({ score }: Props) {
  const pct = Math.round(score.overall * 100);
  return (
    <aside aria-label="Match score">
      <p>
        <strong>{pct}% match</strong>
      </p>
      <ul>
        {Object.entries(score.by_category).map(([cat, val]) => (
          <li key={cat}>
            {cat}: {Math.round(val * 100)}%
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 8: Create `web/src/components/DebugPanel.tsx`**

```typescript
import { useState } from 'react';
import type { AdaptedResume, VisitorContext } from '../types';

interface Props {
  context: VisitorContext;
  adapted: AdaptedResume;
}

export function DebugPanel({ context, adapted }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Agent Context</summary>
      <dl>
        <dt>Source</dt>
        <dd>{context.source}</dd>
        <dt>Company</dt>
        <dd>{context.company}</dd>
        <dt>Role</dt>
        <dd>{context.role ?? '—'}</dd>
        <dt>Adaptation</dt>
        <dd>{adapted.company}</dd>
        <dt>Generated</dt>
        <dd>{adapted.generated_at}</dd>
        <dt>Match Score</dt>
        <dd>{Math.round(adapted.match_score.overall * 100)}%</dd>
      </dl>
    </details>
  );
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npx tsc --noEmit
```
Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/
git commit -m "feat(web): add presentational section components"
```

---

## Task 12: `AdaptiveResume` composer with integration test

**Files:**
- Create: `web/src/__tests__/AdaptiveResume.test.tsx`
- Create: `web/src/components/AdaptiveResume.tsx`

- [ ] **Step 1: Write failing test `web/src/__tests__/AdaptiveResume.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptiveResume } from '../components/AdaptiveResume';
import type { AdaptedResume, BaseResume, VisitorContext } from '../types';

const base: BaseResume = {
  name: 'Lianghui Yi',
  contact: {
    location: 'Santa Clara, CA',
    phone: '(925) 900-3467',
    email: 'verky.yi@gmail.com',
    linkedin: 'https://linkedin.com/in/lianghuiyi',
    github: 'https://github.com/verkyyi',
  },
  summary_template: 'ignored',
  summary_defaults: {},
  experience: [
    {
      id: 'a',
      title: 'A Title',
      company: 'A Co',
      location: 'X',
      dates: '2024',
      bullets: [{ id: 'b1', text: 'Original bullet' }],
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Project One',
      tagline: 'tag',
      url: 'https://example.com',
      github: 'https://example.com',
      dates: '2025',
      tags: [],
      bullets: [{ id: 'pb1', text: 'Project bullet' }],
    },
  ],
  education: [
    { degree: 'Deg', school: 'Sch', location: 'Loc', dates: '2023' },
  ],
  skills: {
    groups: [
      { id: 'ai', label: 'AI', items: ['Python', 'RAG Pipelines'] },
    ],
  },
  volunteering: [
    { title: 'V', org: 'O', location: 'L', dates: 'd', description: 'desc' },
  ],
};

const adapted: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Adapted summary text',
  section_order: ['summary', 'projects', 'experience', 'skills'],
  experience_order: ['a'],
  bullet_overrides: { b1: 'Overridden bullet' },
  project_order: ['p1'],
  skill_emphasis: ['RAG Pipelines'],
  match_score: {
    overall: 0.87,
    by_category: { ai: 0.9 },
    matched_keywords: ['Python'],
    missing_keywords: [],
  },
};

const context: VisitorContext = {
  source: 'slug',
  slug: 'cohere-fde',
  company: 'cohere',
  role: 'FDE, Agentic Platform',
};

describe('AdaptiveResume', () => {
  it('renders the adapted summary', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Adapted summary text')).toBeInTheDocument();
  });

  it('renders experience bullets with overrides applied', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Overridden bullet')).toBeInTheDocument();
    expect(screen.queryByText('Original bullet')).not.toBeInTheDocument();
  });

  it('renders sections in the order specified by adapted.section_order', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    const sections = screen.getAllByRole('region');
    const labels = sections.map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(['Summary', 'Projects', 'Experience', 'Skills']);
  });

  it('emphasizes skills listed in adapted.skill_emphasis', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    const rag = screen.getByText('RAG Pipelines');
    expect(rag.getAttribute('data-emphasized')).toBe('true');
    const py = screen.getByText('Python');
    expect(py.getAttribute('data-emphasized')).toBe('false');
  });

  it('renders match score', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText(/87% match/)).toBeInTheDocument();
  });

  it('renders debug panel with detected company', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Agent Context')).toBeInTheDocument();
    expect(screen.getByText('cohere')).toBeInTheDocument();
  });

  it('renders name and contact from base resume', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Lianghui Yi')).toBeInTheDocument();
    expect(screen.getByText('verky.yi@gmail.com')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- AdaptiveResume
```
Expected: FAIL — cannot resolve `../components/AdaptiveResume`.

- [ ] **Step 3: Implement `web/src/components/AdaptiveResume.tsx`**

```typescript
import type { AdaptedResume, BaseResume, SectionName, VisitorContext } from '../types';
import { SummarySection } from './SummarySection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { EducationSection } from './EducationSection';
import { VolunteeringSection } from './VolunteeringSection';
import { MatchScoreBar } from './MatchScoreBar';
import { DebugPanel } from './DebugPanel';

interface Props {
  base: BaseResume;
  adapted: AdaptedResume;
  context: VisitorContext;
}

export function AdaptiveResume({ base, adapted, context }: Props) {
  const renderers: Record<SectionName, () => JSX.Element> = {
    summary: () => <SummarySection summary={adapted.summary} />,
    experience: () => (
      <ExperienceSection
        experience={base.experience}
        order={adapted.experience_order}
        bulletOverrides={adapted.bullet_overrides}
      />
    ),
    projects: () => (
      <ProjectsSection projects={base.projects} order={adapted.project_order} />
    ),
    skills: () => (
      <SkillsSection groups={base.skills.groups} emphasis={adapted.skill_emphasis} />
    ),
    education: () => <EducationSection education={base.education} />,
    volunteering: () => <VolunteeringSection items={base.volunteering} />,
  };

  return (
    <main>
      <header>
        <h1>{base.name}</h1>
        <p>
          {base.contact.location} · <a href={`mailto:${base.contact.email}`}>{base.contact.email}</a>{' '}
          · <a href={base.contact.linkedin}>LinkedIn</a> · <a href={base.contact.github}>GitHub</a>
        </p>
        <DebugPanel context={context} adapted={adapted} />
        <MatchScoreBar score={adapted.match_score} />
      </header>
      {adapted.section_order.map((name) => {
        const render = renderers[name];
        if (!render) return null;
        return <div key={name}>{render()}</div>;
      })}
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test -- AdaptiveResume
```
Expected: PASS (7 tests).

- [ ] **Step 5: Run full test suite**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm test
```
Expected: ALL PASS (20 web tests total).

- [ ] **Step 6: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/AdaptiveResume.tsx web/src/__tests__/AdaptiveResume.test.tsx
git commit -m "feat(web): add AdaptiveResume composer with section-order rendering"
```

---

## Task 13: Wire App.tsx to load data and render

**Files:**
- Modify: `web/src/App.tsx`
- Create: `web/public/data/` (populated by copy step)

The `data/` directory at the repo root is outside `web/`. For dev mode, we need the React app to fetch it. Two options: (a) Vite `publicDir` pointing at `../data`, (b) a small script that copies `data/` into `web/public/data/` before `dev`/`build`. Option (b) is simpler and more explicit.

- [ ] **Step 1: Add `copy-data` script to `web/package.json`**

Open `web/package.json` and replace the `scripts` section so it reads:

```json
  "scripts": {
    "copy-data": "node -e \"require('node:fs').cpSync('../data', 'public/data', {recursive: true})\"",
    "dev": "npm run copy-data && vite",
    "build": "npm run copy-data && tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 2: Add `public/data/` to web `.gitignore`**

Create `web/.gitignore`:

```
public/data/
```

- [ ] **Step 3: Rewrite `web/src/App.tsx`**

```typescript
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { AdaptiveResume } from './components/AdaptiveResume';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();
  const { adapted, base, error: adaptError } = useAdaptation(
    context?.company ?? null,
  );

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;
  if (!context || !adapted || !base) return <main>Loading…</main>;

  return <AdaptiveResume base={base} adapted={adapted} context={context} />;
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m scripts.adapt_all
cd web
npm run build
```
Expected: build succeeds; `dist/index.html` exists; `dist/data/adapted/cohere.json` exists (copied via `copy-data`).

- [ ] **Step 5: Manual sanity check — run dev server**

Run:
```bash
cd /home/dev/projects/agentfolio/web
npm run dev
```
Open `http://localhost:5173/agentfolio/` — should render default adaptation.
Open `http://localhost:5173/agentfolio/c/cohere-fde` — should render cohere adaptation with projects section before experience, debug panel showing `cohere`, match score ≈ 87%.

Kill the server after verifying.

- [ ] **Step 6: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/.gitignore web/package.json web/src/App.tsx
git commit -m "feat(web): wire App to fetch context and adaptation"
```

---

## Task 14: GitHub Actions — adapt workflow

**Files:**
- Create: `.github/workflows/adapt.yml`

- [ ] **Step 1: Create `.github/workflows/adapt.yml`**

```yaml
name: Adapt Resumes
on:
  push:
    branches: [main]
    paths:
      - 'data/resume.json'
      - 'data/companies/**'
      - 'scripts/**'
  schedule:
    - cron: '0 7 * * 1'  # Mondays 07:00 UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  adapt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - run: pip install -r scripts/requirements.txt

      - name: Run tests
        run: python -m pytest scripts/tests/ -v

      - name: Generate adaptations
        run: python -m scripts.adapt_all

      - name: Commit generated adaptations
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/adapted/
          if git diff --cached --quiet; then
            echo "no adaptation changes"
          else
            git commit -m "chore(adapt): regenerate adapted resumes"
            git push
          fi
```

- [ ] **Step 2: Validate YAML syntax**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/adapt.yml'))" 2>/dev/null || python3 -c "import json; import sys; sys.stdout.write(open('.github/workflows/adapt.yml').read())"
```
If `yaml` is missing:
```bash
python3 -m pip install --user pyyaml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/adapt.yml')); print('valid yaml')"
```
Expected: `valid yaml`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/adapt.yml
git commit -m "ci: add adapt workflow for scheduled regeneration"
```

---

## Task 15: GitHub Actions — deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install web deps
        working-directory: web
        run: npm ci

      - name: Run web tests
        working-directory: web
        run: npm test

      - name: Build web
        working-directory: web
        run: npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate YAML**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('valid yaml')"
```
Expected: `valid yaml`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add deploy workflow to GitHub Pages"
```

---

## Task 16: Final verification and docs

**Files:**
- Modify: `README.md`
- Create: `docs/architecture.md` (copy of the full spec for reference)

- [ ] **Step 1: Save the architecture spec to `docs/architecture.md`**

Create `docs/architecture.md` with the full contents of the architecture document the user provided (the one starting `# AgentFolio — Architecture`). This pins the design for future phases.

- [ ] **Step 2: Expand `README.md`**

Replace `README.md` contents with:

```markdown
# AgentFolio

Open-source agentic portfolio engine. Detects visitor context (URL slug) and renders a resume adapted to the target role.

**Live:** https://verkyyi.github.io/agentfolio

## Status

**Phase 1 — complete:** known-company adaptation via URL slugs. Pre-built adaptations for `cohere` and `default`. Access via `/agentfolio/c/<slug>` where `<slug>` is a key from `data/slugs.json`.

**Next phases:** live generation for unknown companies, analytics, chat widget, architecture page.

## Development

```bash
# Generate adapted resumes
python -m scripts.adapt_all

# Run Python tests
python -m pytest scripts/tests/ -v

# Run web dev server
cd web
npm install
npm run dev
```

Open `http://localhost:5173/agentfolio/c/cohere-fde` to see the Cohere adaptation.

## Architecture

See `docs/architecture.md` for the full design. Implementation plans live in `docs/superpowers/plans/`.
```

- [ ] **Step 3: Full suite verification**

Run:
```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/ -v
cd web
npm test
npm run build
```
Expected: all Python tests pass, all web tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/projects/agentfolio
git add README.md docs/architecture.md
git commit -m "docs: add architecture reference and update README"
```

---

## Acceptance Criteria

Phase 1 is complete when:

1. `python -m scripts.adapt_all` generates `data/adapted/cohere.json` and `data/adapted/default.json` deterministically.
2. `python -m pytest scripts/tests/` passes (14 tests).
3. `cd web && npm test` passes (20+ tests).
4. `cd web && npm run build` produces a `dist/` that loads in a browser.
5. Navigating to `/agentfolio/c/cohere-fde` shows the Cohere adaptation: projects before experience, agentfolio first project, match-score visible, debug panel showing `source: slug`, `company: cohere`.
6. Navigating to `/agentfolio/` (no slug) shows the default adaptation.
7. Navigating to `/agentfolio/c/unknown-slug` falls back to the default adaptation.
8. `.github/workflows/adapt.yml` and `deploy.yml` are valid YAML and commit green on push.

---

## Follow-up Phases (out of scope for this plan)

- **Phase 2:** `adapt-on-request.yml` triggered by `adapt-request` Issues; `useAdaptationProgress` hook polling issue comments; `AdaptationProgress` component; fine-grained PAT in client.
- **Phase 3:** `useBehaviorTracker` hook, `aggregate_feedback.py`, `analytics.yml` weekly cron, `data/analytics.json` output.
- **Phase 4:** Chat widget with RAG over `resume.json`, domain-restricted LLM API key, client-side rate limit.
- **Phase 5:** `/how-it-works` architecture page with pipeline diagram, aggregated stats display, adaptation comparison; JD auto-fetch via `fetch_jds.py` + `jd-sync.yml`; LLM-powered summary rewriting in `adapt_one.py`.
