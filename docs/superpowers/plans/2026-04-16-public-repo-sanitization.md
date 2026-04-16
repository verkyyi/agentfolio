# Public Repo Sanitization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all personal data with sample data, make hardcoded references configurable, write CLAUDE.md and rewrite README so agentfolio is a forkable public framework.

**Architecture:** Clean `data/` with sample "Alex Chen" resume and adaptations. Make repo/base-path references configurable via env vars. Update all tests and docs. The `copy-data` build step handles syncing `data/` → `web/public/data/`.

**Tech Stack:** React, TypeScript, Vite, Vitest, Python, GitHub Actions

---

### Task 1: Create Sample Data Files

**Files:**
- Replace: `data/resume.json`
- Replace: `data/adapted/default.json`
- Replace: `data/adapted/sample-company.json` (new, replaces apple/cohere/openai)
- Delete: `data/adapted/apple.json`
- Delete: `data/adapted/cohere.json`
- Delete: `data/adapted/openai.json`
- Replace: `data/companies/default.json`
- Replace: `data/companies/sample-company.json` (new, replaces apple/cohere/openai)
- Delete: `data/companies/apple.json`
- Delete: `data/companies/cohere.json`
- Delete: `data/companies/openai.json`
- Replace: `data/slugs.json`
- Delete: `data/llm_cache/*`
- Delete: `data/analytics.json`

- [ ] **Step 1: Write sample resume.json**

Replace `data/resume.json` with:

```json
{
  "basics": {
    "name": "Alex Chen",
    "label": "Software Engineer",
    "email": "alex@example.com",
    "phone": "(555) 123-4567",
    "location": {
      "city": "San Francisco",
      "region": "CA",
      "countryCode": "US"
    },
    "profiles": [
      {
        "network": "LinkedIn",
        "url": "https://linkedin.com/in/alexchen"
      },
      {
        "network": "GitHub",
        "url": "https://github.com/alexchen",
        "username": "alexchen"
      }
    ]
  },
  "work": [
    {
      "id": "acme",
      "name": "Acme Corp",
      "position": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "startDate": "2022-06",
      "highlights": [
        "Led migration of monolithic API to event-driven microservices architecture, reducing p99 latency by 40% and enabling independent team deployments.",
        "Built real-time data pipeline processing 2M events/day using Kafka and Flink, powering personalization features that increased user engagement by 25%.",
        "Mentored 3 junior engineers through structured pairing sessions, all promoted within 12 months."
      ],
      "highlightMeta": [
        { "id": "acme-migration", "tags": ["architecture", "microservices", "performance"] },
        { "id": "acme-pipeline", "tags": ["data-engineering", "real-time", "infrastructure"] },
        { "id": "acme-mentoring", "tags": ["leadership", "mentoring"] }
      ]
    },
    {
      "id": "startup",
      "name": "DataFlow Startup",
      "position": "Full-Stack Engineer",
      "location": "Remote",
      "startDate": "2020-01",
      "endDate": "2022-05",
      "highlights": [
        "Designed and shipped the core analytics dashboard used by 500+ enterprise customers, iterating on feedback from weekly customer calls.",
        "Implemented CI/CD pipeline with GitHub Actions reducing deploy time from 45 minutes to 8 minutes with automated rollback on failure.",
        "Built OAuth2/OIDC integration supporting 5 identity providers, enabling enterprise SSO adoption."
      ],
      "highlightMeta": [
        { "id": "df-dashboard", "tags": ["full-stack", "product", "customer-facing"] },
        { "id": "df-cicd", "tags": ["ci-cd", "infrastructure", "automation"] },
        { "id": "df-auth", "tags": ["security", "enterprise", "full-stack"] }
      ]
    }
  ],
  "projects": [
    {
      "id": "ml-monitor",
      "name": "ML Model Monitor",
      "description": "Open-source ML model monitoring dashboard",
      "url": "https://example.com/ml-monitor",
      "github": "https://github.com/alexchen/ml-monitor",
      "startDate": "2024-01",
      "keywords": ["machine-learning", "monitoring", "full-stack", "open-source"],
      "highlights": [
        "Built a real-time model drift detection system with configurable alerting thresholds, deployed on AWS Lambda for zero-ops monitoring.",
        "Designed a React dashboard visualizing prediction distributions, feature importance, and alert history across multiple model versions."
      ],
      "highlightMeta": [
        { "id": "mlm-drift", "tags": ["machine-learning", "infrastructure", "monitoring"] },
        { "id": "mlm-dashboard", "tags": ["full-stack", "data-visualization", "react"] }
      ]
    },
    {
      "id": "cli-toolkit",
      "name": "DevCLI Toolkit",
      "description": "Developer productivity CLI tools",
      "url": "https://example.com/devcli",
      "github": "https://github.com/alexchen/devcli",
      "startDate": "2023-06",
      "keywords": ["cli", "developer-tools", "rust", "open-source"],
      "highlights": [
        "Created a Rust-based CLI toolkit with sub-5ms startup time for common developer workflows: git branch cleanup, log tailing, and config management.",
        "Published to crates.io with 2,000+ downloads; maintained backward compatibility across 8 minor releases."
      ],
      "highlightMeta": [
        { "id": "cli-perf", "tags": ["rust", "performance", "developer-tools"] },
        { "id": "cli-community", "tags": ["open-source", "community"] }
      ]
    }
  ],
  "skills": [
    {
      "id": "languages",
      "name": "Languages & Frameworks",
      "keywords": ["TypeScript", "Python", "Rust", "React", "Node.js", "FastAPI", "SQL"]
    },
    {
      "id": "infrastructure",
      "name": "Infrastructure & DevOps",
      "keywords": ["AWS", "Docker", "Kubernetes", "GitHub Actions", "Terraform", "Kafka"]
    },
    {
      "id": "data",
      "name": "Data & ML",
      "keywords": ["PostgreSQL", "Redis", "Apache Flink", "scikit-learn", "MLflow"]
    }
  ],
  "education": [
    {
      "institution": "UC Berkeley",
      "studyType": "B.S.",
      "area": "Computer Science",
      "location": "Berkeley, CA",
      "startDate": "2016-08",
      "endDate": "2020-05"
    }
  ],
  "volunteer": [
    {
      "organization": "Code for SF",
      "position": "Tech Lead",
      "location": "San Francisco, CA",
      "startDate": "2023-01",
      "summary": "Led a team of 8 volunteers building civic tech tools for local nonprofits, delivering 3 projects in 12 months."
    }
  ],
  "meta": {
    "version": "1.0.0",
    "agentfolio": {
      "summary_template": "Software Engineer with {years}+ years building {focus} at scale. {strength}. Skilled in {highlight}.",
      "summary_defaults": {
        "years": "4",
        "focus": "full-stack applications and data infrastructure",
        "strength": "Experienced shipping production systems serving enterprise customers",
        "highlight": "distributed systems, real-time data pipelines, and developer tooling"
      }
    }
  }
}
```

- [ ] **Step 2: Write sample adapted/default.json**

Replace `data/adapted/default.json` with:

```json
{
  "basics": {
    "name": "Alex Chen",
    "label": "Software Engineer",
    "email": "alex@example.com",
    "phone": "(555) 123-4567",
    "summary": "Software Engineer with 4+ years building full-stack applications and data infrastructure at scale. Experienced shipping production systems serving enterprise customers. Skilled in distributed systems, real-time data pipelines, and developer tooling.",
    "location": {
      "city": "San Francisco",
      "region": "CA",
      "countryCode": "US"
    },
    "profiles": [
      { "network": "LinkedIn", "url": "https://linkedin.com/in/alexchen" },
      { "network": "GitHub", "url": "https://github.com/alexchen", "username": "alexchen" }
    ]
  },
  "work": [
    {
      "id": "acme",
      "name": "Acme Corp",
      "position": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "startDate": "2022-06",
      "highlights": [
        "Led migration of monolithic API to event-driven microservices architecture, reducing p99 latency by 40% and enabling independent team deployments.",
        "Built real-time data pipeline processing 2M events/day using Kafka and Flink, powering personalization features that increased user engagement by 25%.",
        "Mentored 3 junior engineers through structured pairing sessions, all promoted within 12 months."
      ]
    },
    {
      "id": "startup",
      "name": "DataFlow Startup",
      "position": "Full-Stack Engineer",
      "location": "Remote",
      "startDate": "2020-01",
      "endDate": "2022-05",
      "highlights": [
        "Designed and shipped the core analytics dashboard used by 500+ enterprise customers, iterating on feedback from weekly customer calls.",
        "Implemented CI/CD pipeline with GitHub Actions reducing deploy time from 45 minutes to 8 minutes with automated rollback on failure.",
        "Built OAuth2/OIDC integration supporting 5 identity providers, enabling enterprise SSO adoption."
      ]
    }
  ],
  "projects": [
    {
      "id": "ml-monitor",
      "name": "ML Model Monitor",
      "description": "Open-source ML model monitoring dashboard",
      "url": "https://example.com/ml-monitor",
      "github": "https://github.com/alexchen/ml-monitor",
      "startDate": "2024-01",
      "highlights": [
        "Built a real-time model drift detection system with configurable alerting thresholds, deployed on AWS Lambda for zero-ops monitoring.",
        "Designed a React dashboard visualizing prediction distributions, feature importance, and alert history across multiple model versions."
      ],
      "keywords": ["machine-learning", "monitoring", "full-stack", "open-source"]
    },
    {
      "id": "cli-toolkit",
      "name": "DevCLI Toolkit",
      "description": "Developer productivity CLI tools",
      "url": "https://example.com/devcli",
      "github": "https://github.com/alexchen/devcli",
      "startDate": "2023-06",
      "highlights": [
        "Created a Rust-based CLI toolkit with sub-5ms startup time for common developer workflows: git branch cleanup, log tailing, and config management.",
        "Published to crates.io with 2,000+ downloads; maintained backward compatibility across 8 minor releases."
      ],
      "keywords": ["cli", "developer-tools", "rust", "open-source"]
    }
  ],
  "skills": [
    { "id": "languages", "name": "Languages & Frameworks", "keywords": ["TypeScript", "Python", "Rust", "React", "Node.js", "FastAPI", "SQL"] },
    { "id": "infrastructure", "name": "Infrastructure & DevOps", "keywords": ["AWS", "Docker", "Kubernetes", "GitHub Actions", "Terraform", "Kafka"] },
    { "id": "data", "name": "Data & ML", "keywords": ["PostgreSQL", "Redis", "Apache Flink", "scikit-learn", "MLflow"] }
  ],
  "education": [
    { "institution": "UC Berkeley", "studyType": "B.S.", "area": "Computer Science", "location": "Berkeley, CA", "startDate": "2016-08", "endDate": "2020-05" }
  ],
  "volunteer": [
    { "organization": "Code for SF", "position": "Tech Lead", "location": "San Francisco, CA", "startDate": "2023-01", "summary": "Led a team of 8 volunteers building civic tech tools for local nonprofits, delivering 3 projects in 12 months." }
  ],
  "meta": {
    "version": "1.0.0",
    "lastModified": "2026-01-01T00:00:00+00:00",
    "agentfolio": {
      "company": "default",
      "generated_by": "sample",
      "match_score": { "overall": 0.5, "by_category": { "languages": 0.5, "infrastructure": 0.5, "data": 0.5 }, "matched_keywords": ["TypeScript", "Python", "AWS"], "missing_keywords": [] },
      "skill_emphasis": [],
      "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"]
    }
  }
}
```

- [ ] **Step 3: Write sample adapted/sample-company.json**

Create `data/adapted/sample-company.json`:

```json
{
  "basics": {
    "name": "Alex Chen",
    "label": "Software Engineer",
    "email": "alex@example.com",
    "phone": "(555) 123-4567",
    "summary": "Software Engineer with 4+ years building data-intensive applications and ML infrastructure. Experienced shipping real-time pipelines and monitoring systems serving enterprise customers. Skilled in distributed systems, machine learning operations, and full-stack development.",
    "location": {
      "city": "San Francisco",
      "region": "CA",
      "countryCode": "US"
    },
    "profiles": [
      { "network": "LinkedIn", "url": "https://linkedin.com/in/alexchen" },
      { "network": "GitHub", "url": "https://github.com/alexchen", "username": "alexchen" }
    ]
  },
  "work": [
    {
      "id": "acme",
      "name": "Acme Corp",
      "position": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "startDate": "2022-06",
      "highlights": [
        "Built real-time data pipeline processing 2M events/day using Kafka and Flink, powering personalization features that increased user engagement by 25%.",
        "Led migration of monolithic API to event-driven microservices architecture, reducing p99 latency by 40% and enabling independent team deployments.",
        "Mentored 3 junior engineers through structured pairing sessions, all promoted within 12 months."
      ]
    },
    {
      "id": "startup",
      "name": "DataFlow Startup",
      "position": "Full-Stack Engineer",
      "location": "Remote",
      "startDate": "2020-01",
      "endDate": "2022-05",
      "highlights": [
        "Designed and shipped the core analytics dashboard used by 500+ enterprise customers, iterating on feedback from weekly customer calls.",
        "Implemented CI/CD pipeline with GitHub Actions reducing deploy time from 45 minutes to 8 minutes with automated rollback on failure.",
        "Built OAuth2/OIDC integration supporting 5 identity providers, enabling enterprise SSO adoption."
      ]
    }
  ],
  "projects": [
    {
      "id": "ml-monitor",
      "name": "ML Model Monitor",
      "description": "Open-source ML model monitoring dashboard",
      "url": "https://example.com/ml-monitor",
      "github": "https://github.com/alexchen/ml-monitor",
      "startDate": "2024-01",
      "highlights": [
        "Built a real-time model drift detection system with configurable alerting thresholds, deployed on AWS Lambda for zero-ops monitoring.",
        "Designed a React dashboard visualizing prediction distributions, feature importance, and alert history across multiple model versions."
      ],
      "keywords": ["machine-learning", "monitoring", "full-stack", "open-source"]
    },
    {
      "id": "cli-toolkit",
      "name": "DevCLI Toolkit",
      "description": "Developer productivity CLI tools",
      "url": "https://example.com/devcli",
      "github": "https://github.com/alexchen/devcli",
      "startDate": "2023-06",
      "highlights": [
        "Created a Rust-based CLI toolkit with sub-5ms startup time for common developer workflows: git branch cleanup, log tailing, and config management.",
        "Published to crates.io with 2,000+ downloads; maintained backward compatibility across 8 minor releases."
      ],
      "keywords": ["cli", "developer-tools", "rust", "open-source"]
    }
  ],
  "skills": [
    { "id": "languages", "name": "Languages & Frameworks", "keywords": ["TypeScript", "Python", "Rust", "React", "Node.js", "FastAPI", "SQL"] },
    { "id": "infrastructure", "name": "Infrastructure & DevOps", "keywords": ["AWS", "Docker", "Kubernetes", "GitHub Actions", "Terraform", "Kafka"] },
    { "id": "data", "name": "Data & ML", "keywords": ["PostgreSQL", "Redis", "Apache Flink", "scikit-learn", "MLflow"] }
  ],
  "education": [
    { "institution": "UC Berkeley", "studyType": "B.S.", "area": "Computer Science", "location": "Berkeley, CA", "startDate": "2016-08", "endDate": "2020-05" }
  ],
  "volunteer": [
    { "organization": "Code for SF", "position": "Tech Lead", "location": "San Francisco, CA", "startDate": "2023-01", "summary": "Led a team of 8 volunteers building civic tech tools for local nonprofits, delivering 3 projects in 12 months." }
  ],
  "meta": {
    "version": "1.0.0",
    "lastModified": "2026-01-01T00:00:00+00:00",
    "agentfolio": {
      "company": "sample-company",
      "generated_by": "sample",
      "match_score": { "overall": 0.82, "by_category": { "languages": 0.7, "infrastructure": 0.9, "data": 0.85 }, "matched_keywords": ["Python", "Kafka", "AWS", "scikit-learn"], "missing_keywords": ["Go", "Spark"] },
      "skill_emphasis": ["Kafka", "scikit-learn", "Apache Flink"],
      "section_order": ["basics", "projects", "work", "skills", "education", "volunteer"]
    }
  }
}
```

- [ ] **Step 4: Write sample company and slug files**

Replace `data/companies/default.json`:
```json
{
  "company": "default",
  "role": null
}
```

Create `data/companies/sample-company.json`:
```json
{
  "company": "Sample Company",
  "role": "Software Engineer"
}
```

Replace `data/slugs.json`:
```json
{
  "sample": { "company": "sample-company", "role": "Software Engineer", "created": "2026-01-01", "context": "Sample slug for demo" }
}
```

- [ ] **Step 5: Delete old personal data files**

```bash
cd /home/dev/projects/agentfolio
git rm data/adapted/apple.json data/adapted/cohere.json data/adapted/openai.json
git rm data/companies/apple.json data/companies/cohere.json data/companies/openai.json
git rm data/llm_cache/*
git rm data/analytics.json
```

- [ ] **Step 6: Clean web/public/data (stale copies)**

```bash
rm -rf web/public/data
```

This directory is regenerated by `npm run copy-data` on every build/dev start.

- [ ] **Step 7: Commit**

```bash
git add data/
git commit -m "feat: replace personal data with sample 'Alex Chen' data for public release"
```

---

### Task 2: Make Hardcoded References Configurable

**Files:**
- Modify: `web/index.html`
- Modify: `web/vite.config.ts`
- Modify: `web/src/components/PipelineDiagram.tsx:20`
- Modify: `web/src/components/ArchitecturePage.tsx:87`
- Modify: `.github/workflows/deploy.yml:40`
- Modify: `web/.env.example`
- Modify: `scripts/chat_answer.py:24-31`

- [ ] **Step 1: Update index.html title**

In `web/index.html`, change line 14 from:
```html
<title>Lianghui Yi — AgentFolio</title>
```
to:
```html
<title>AgentFolio</title>
```

- [ ] **Step 2: Make vite base path configurable**

Replace `web/vite.config.ts` with:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
```

- [ ] **Step 3: Make PipelineDiagram repo URL configurable**

In `web/src/components/PipelineDiagram.tsx`, change line 20 from:
```typescript
const REPO = 'https://github.com/verkyyi/agentfolio';
```
to:
```typescript
const REPO = import.meta.env.VITE_GITHUB_REPO
  ? `https://github.com/${import.meta.env.VITE_GITHUB_REPO}`
  : 'https://github.com';
```

- [ ] **Step 4: Make ArchitecturePage footer link configurable**

In `web/src/components/ArchitecturePage.tsx`, change line 87 from:
```tsx
<a href="https://github.com/verkyyi/agentfolio" target="_blank" rel="noreferrer">
```
to:
```tsx
<a href={import.meta.env.VITE_GITHUB_REPO ? `https://github.com/${import.meta.env.VITE_GITHUB_REPO}` : '#'} target="_blank" rel="noreferrer">
```

- [ ] **Step 5: Update ArchitecturePage compareSlugs**

In `web/src/App.tsx`, change line (around line 97) from:
```tsx
return <ArchitecturePage compareSlugs={['cohere', 'openai', 'default']} />;
```
to:
```tsx
return <ArchitecturePage compareSlugs={['sample-company', 'default']} />;
```

- [ ] **Step 6: Make deploy.yml use github.repository**

In `.github/workflows/deploy.yml`, change line 40 from:
```yaml
VITE_GITHUB_REPO: verkyyi/agentfolio
```
to:
```yaml
VITE_GITHUB_REPO: ${{ github.repository }}
```

- [ ] **Step 7: Update .env.example**

Replace `web/.env.example` with:
```
# Fine-grained PAT with issues:read+write on your fork only.
# For local dev, copy this file to .env.local and fill in the values.
# For production, these are set as Actions secrets / workflow env vars.
VITE_GITHUB_PAT=
VITE_GITHUB_REPO=your-username/your-repo
VITE_BASE_PATH=/
```

- [ ] **Step 8: Make chat_answer.py derive name from resume**

In `scripts/chat_answer.py`, change the `build_system_prompt` function (lines 24-31) from:
```python
def build_system_prompt(resume: dict) -> str:
    return (
        "You are a helpful assistant answering questions about Lianghui Yi's "
        "professional background. Use only the resume JSON below as ground truth. "
        "If the resume does not contain the answer, say so — do not invent. "
        "Keep answers concise (1-3 sentences).\n\n"
        f"RESUME:\n{json.dumps(resume, ensure_ascii=False)}"
    )
```
to:
```python
def build_system_prompt(resume: dict) -> str:
    name = resume.get("basics", {}).get("name", "the candidate")
    return (
        f"You are a helpful assistant answering questions about {name}'s "
        "professional background. Use only the resume JSON below as ground truth. "
        "If the resume does not contain the answer, say so — do not invent. "
        "Keep answers concise (1-3 sentences).\n\n"
        f"RESUME:\n{json.dumps(resume, ensure_ascii=False)}"
    )
```

- [ ] **Step 9: Update docs/architecture.md header**

In `docs/architecture.md`, change lines 5-6 from:
```
**Repo:** github.com/verkyyi/agentfolio
**Live:** verkyyi.github.io/agentfolio
```
to:
```
**Repo:** (your fork)
**Live:** (your GitHub Pages URL)
```

- [ ] **Step 10: Commit**

```bash
git add web/index.html web/vite.config.ts web/src/components/PipelineDiagram.tsx web/src/components/ArchitecturePage.tsx web/src/App.tsx .github/workflows/deploy.yml web/.env.example scripts/chat_answer.py docs/architecture.md
git commit -m "feat: make all hardcoded references configurable via env vars"
```

---

### Task 3: Update Unit Tests

**Files:**
- Modify: `web/src/__tests__/AdaptiveResume.test.tsx`
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Update AdaptiveResume.test.tsx personal info**

In `web/src/__tests__/AdaptiveResume.test.tsx`, replace the `adapted` fixture (lines 61-112) with:

```typescript
const adapted = mockAdapted({
  basics: {
    name: 'Alex Chen',
    email: 'alex@example.com',
    summary: 'Adapted summary text',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [
      { network: 'LinkedIn', url: 'https://linkedin.com/in/alexchen' },
      { network: 'GitHub', url: 'https://github.com/alexchen' },
    ],
  },
  work: [
    {
      id: 'a',
      name: 'A Co',
      position: 'A Title',
      location: 'X',
      startDate: '2024',
      highlights: ['Overridden bullet'],
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Project One',
      description: 'tag',
      url: 'https://example.com',
      startDate: '2025',
      highlights: ['Project bullet'],
      keywords: [],
    },
  ],
  skills: [
    { id: 'ai', name: 'AI', keywords: ['Python', 'RAG Pipelines'] },
  ],
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'sample-company',
      generated_by: 'sample',
      match_score: {
        overall: 0.87,
        by_category: { ai: 0.9 },
        matched_keywords: ['Python'],
        missing_keywords: [],
      },
      skill_emphasis: ['RAG Pipelines'],
      section_order: ['basics', 'projects', 'work', 'skills'],
    },
  },
});

const context: VisitorContext = {
  source: 'slug',
  slug: 'sample',
  company: 'sample-company',
  role: 'Software Engineer',
};
```

Then update the two assertions that check personal info (lines 160-162):
```typescript
  it('renders name and contact from adapted resume', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });
```

And the CTA click test (line 170):
```typescript
    await user.click(screen.getByText('alex@example.com'));
```

And the debug panel assertion (line 156):
```typescript
    expect(screen.getByText('sample-company')).toBeInTheDocument();
```

- [ ] **Step 2: Update App.test.tsx personal info**

In `web/src/__tests__/App.test.tsx`, replace the `defaultAdapted` fixture's `basics` (lines 62-69):
```typescript
const defaultAdapted = mockAdapted({
  basics: {
    name: 'Alex Chen',
    email: 'alex@example.com',
    summary: 'Default summary',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'default',
      generated_by: 'sample',
      match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});
```

Replace the `cohereAdapted` fixture (rename to `sampleAdapted`):
```typescript
const sampleAdapted = mockAdapted({
  basics: {
    ...defaultAdapted.basics,
    summary: 'Sample company summary',
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'sample-company',
      generated_by: 'sample',
      match_score: { overall: 0.7, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});
```

Update `slugRegistry`:
```typescript
const slugRegistry: SlugRegistry = {
  'sample': { company: 'sample-company', role: 'Software Engineer', created: '2026-01-01', context: 'Sample slug for demo' },
};
```

Update the fetch mock — change `cohere.json` to `sample-company.json`:
```typescript
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('data/slugs.json')) {
      return { ok: true, json: async () => slugRegistry };
    }
    if (url.includes('data/adapted/sample-company.json')) {
      return { ok: true, json: async () => sampleAdapted };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    return { ok: false, status: 404 };
  }));
```

Update the slug test — change `cohere-fde` to `sample` and update assertion text:
```typescript
describe('App — slug path', () => {
  it('renders company-specific adaptation for valid slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/sample');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Sample company summary')).toBeInTheDocument());
  });

  it('falls back to default for unknown slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/unknown-co');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run unit tests**

```bash
cd /home/dev/projects/agentfolio/web && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add web/src/__tests__/AdaptiveResume.test.tsx web/src/__tests__/App.test.tsx
git commit -m "test: update test fixtures to use sample data instead of personal info"
```

---

### Task 4: Update E2E Tests

**Files:**
- Modify: `web/e2e/adaptation-access.spec.ts`

- [ ] **Step 1: Rewrite e2e tests for sample data**

Replace `web/e2e/adaptation-access.spec.ts` with:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Adaptation Access', () => {
  test('default adaptation loads at root', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
  });

  test('sample slug loads company adaptation', async ({ page }) => {
    await page.goto('c/sample');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    await expect(page.getByText('82% match')).toBeAttached();
  });

  test('unknown slug falls back to default', async ({ page }) => {
    await page.goto('c/unknown-company-xyz');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
  });

  test('default adaptation has expected content', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    await expect(page.getByText(/Software Engineer/)).toBeAttached();
    await expect(page.locator('a[href="mailto:alex@example.com"]')).toBeAttached();
  });

  test('no console errors on adaptation pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('c/sample');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('company adaptations have tailored summaries', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    const defaultSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    await page.goto('c/sample');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    const sampleSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    expect(defaultSummary).not.toEqual(sampleSummary);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add web/e2e/adaptation-access.spec.ts
git commit -m "test: update e2e tests for sample data"
```

---

### Task 5: Write CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

Create `CLAUDE.md` at the repo root:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for AI-assisted development"
```

---

### Task 6: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md**

Replace the entire file with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as fork-friendly framework guide"
```

---

### Task 7: Full Verification

**Files:** None (verification only)

- [ ] **Step 1: Type-check**

```bash
cd /home/dev/projects/agentfolio/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all unit tests**

```bash
cd /home/dev/projects/agentfolio/web && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Verify no remaining personal info in source**

```bash
cd /home/dev/projects/agentfolio
grep -r "Lianghui Yi\|verky\.yi@gmail\|925.*900.*3467\|verkyyi/agentfolio\|verkyyi\.github\.io\|linkedin.com/in/lianghuiyi\|github.com/verkyyi" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.html" --include="*.yml" --include="*.py" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude-dir="docs/superpowers/plans" --exclude-dir="docs/superpowers/specs" \
  | grep -v "MEMORY.md"
```

Expected: no matches. (Plans/specs in docs/superpowers/ contain historical references which is acceptable. MEMORY.md is auto-memory, not published.)

- [ ] **Step 4: Build the site**

```bash
cd /home/dev/projects/agentfolio/web && npm run build
```

Expected: builds successfully.

- [ ] **Step 5: Verify built bundle is clean**

```bash
grep -c "Lianghui Yi\|verky\.yi@gmail\|925.*900.*3467" /home/dev/projects/agentfolio/web/dist/assets/*.js
```

Expected: 0 matches.
