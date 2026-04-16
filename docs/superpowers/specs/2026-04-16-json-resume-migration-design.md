# JSON Resume Schema Migration

## Summary

Migrate `data/resume.json` and `data/adapted/*.json` to the [JSON Resume](https://jsonresume.org/schema) standard schema, extended with AgentFolio-specific metadata under `meta.agentfolio`. This enables compatibility with the JSON Resume ecosystem (themes, renderers, validators, LinkedIn importers) while preserving our adaptation features.

## Decisions

- **Extended JSON Resume:** Standard field names with custom extensions (`id`, `tags`, `highlightMeta`) alongside them. JSON Resume tools read the standard fields and ignore ours.
- **Complete adapted output:** Each adapted resume is a full, self-contained JSON Resume document — not a diff/overlay. Any JSON Resume renderer can display it directly.
- **`meta.agentfolio` namespace:** AgentFolio-specific metadata (match_score, skill_emphasis, section_order) lives under `meta.agentfolio` to avoid collision with standard fields.

## Base Resume: `data/resume.json`

### Schema Mapping

| Current | JSON Resume |
|---------|-------------|
| `name` | `basics.name` |
| `contact.email` | `basics.email` |
| `contact.phone` | `basics.phone` |
| `contact.location` | `basics.location.city` + `region` |
| `contact.linkedin` | `basics.profiles[0]` (network: "LinkedIn") |
| `contact.github` | `basics.profiles[1]` (network: "GitHub") |
| `summary_template` | `meta.agentfolio.summary_template` |
| `summary_defaults` | `meta.agentfolio.summary_defaults` |
| `experience[]` | `work[]` |
| `experience[].title` | `work[].position` |
| `experience[].company` | `work[].name` |
| `experience[].dates` | `work[].startDate` + `endDate` (ISO 8601) |
| `experience[].bullets[].text` | `work[].highlights[]` |
| `experience[].bullets[].id/tags/adaptations` | `work[].highlightMeta[]` (custom extension) |
| `experience[].id` | `work[].id` (custom extension) |
| `experience[].subtitle` | `work[].description` |
| `projects[].tagline` | `projects[].description` |
| `projects[].bullets[].text` | `projects[].highlights[]` |
| `projects[].tags` | `projects[].keywords` |
| `projects[].github` | `projects[].github` (custom extension) |
| `projects[].id` | `projects[].id` (custom extension) |
| `skills.groups[]` | `skills[]` |
| `skills.groups[].label` | `skills[].name` |
| `skills.groups[].items` | `skills[].keywords` |
| `skills.groups[].id` | `skills[].id` (custom extension) |
| `education[].degree` | `education[].studyType` + `area` |
| `education[].school` | `education[].institution` |
| `education[].note` | `education[].score` |
| `volunteering[]` | `volunteer[]` |
| `volunteering[].org` | `volunteer[].organization` |
| `volunteering[].title` | `volunteer[].position` |

### Example Structure

```json
{
  "basics": {
    "name": "Lianghui Yi",
    "label": "Forward Deployed Engineer",
    "email": "verky.yi@gmail.com",
    "phone": "(925) 900-3467",
    "location": { "city": "Santa Clara", "region": "CA", "countryCode": "US" },
    "profiles": [
      { "network": "LinkedIn", "url": "https://linkedin.com/in/lianghuiyi" },
      { "network": "GitHub", "url": "https://github.com/verkyyi", "username": "verkyyi" }
    ]
  },
  "work": [
    {
      "id": "24helpful",
      "name": "24 Helpful, LLC",
      "position": "Co-Founder & AI Engineer",
      "location": "Santa Clara, CA",
      "startDate": "2024-03",
      "highlights": [
        "Designed and shipped a self-evolving code system (generator/evaluator loop)..."
      ],
      "highlightMeta": [
        { "id": "24h-evolving-code", "tags": ["agentic", "ci-cd", "rapid-experimentation", "evaluation"] }
      ]
    }
  ],
  "projects": [
    {
      "id": "tokenman",
      "name": "tokenman.io",
      "description": "Claude Code Hosting & AI Repo Self-Evolution",
      "url": "https://tokenman.io",
      "github": "https://github.com/verkyyi/tokenman",
      "startDate": "2026-03",
      "highlights": ["Built terminal.tokenman.io — a multi-tenant Claude Code CLI hosting SaaS..."],
      "keywords": ["agentic", "infrastructure", "ci-cd", "saas"]
    }
  ],
  "skills": [
    { "id": "ai", "name": "AI & Agentic Systems", "keywords": ["Autonomous Agent Development", "LLM Integration", "RAG Pipelines", "MCP (Model Context Protocol)", "Prompt Engineering", "RLHF Concepts", "Evaluation Framework Design (Generator/Evaluator)", "Data Pipeline Architecture"] }
  ],
  "education": [
    { "institution": "Georgetown University", "area": "Data Science and Analytics", "studyType": "Master", "startDate": "2023-09", "endDate": "2025-05", "location": "Washington, DC", "score": "Returning Student Scholarship (Top 3%)" }
  ],
  "volunteer": [
    { "organization": "1124 Space", "position": "Volunteer Lead", "location": "Arlington, VA", "startDate": "2024-04", "endDate": "2025-12", "summary": "Led community initiatives and organized weekly founder-focused events..." }
  ],
  "meta": {
    "version": "1.0.0",
    "agentfolio": {
      "summary_template": "Forward Deployed Engineer with 5+ years shipping {focus} at scale...",
      "summary_defaults": {
        "focus": "full-stack products and data infrastructure",
        "surface": "front-end interfaces",
        "infra": "backend systems and cloud infrastructure",
        "systems": "AI platforms",
        "highlight": "generative AI engineering, rapid experimentation, and high-quality data solutions"
      }
    }
  }
}
```

## Adapted Output: `data/adapted/*.json`

A complete, self-contained JSON Resume document. No overlay/diff format.

```json
{
  "basics": {
    "name": "Lianghui Yi",
    "label": "Forward Deployed Engineer",
    "email": "verky.yi@gmail.com",
    "phone": "(925) 900-3467",
    "summary": "LLM-generated tailored summary...",
    "location": { "city": "Santa Clara", "region": "CA", "countryCode": "US" },
    "profiles": [
      { "network": "LinkedIn", "url": "https://linkedin.com/in/lianghuiyi" },
      { "network": "GitHub", "url": "https://github.com/verkyyi", "username": "verkyyi" }
    ]
  },
  "work": [
    {
      "name": "24 Helpful, LLC",
      "position": "Co-Founder & AI Engineer",
      "location": "Santa Clara, CA",
      "startDate": "2024-03",
      "highlights": ["Tailored bullet text..."]
    }
  ],
  "projects": [
    {
      "name": "tokenman.io",
      "description": "Claude Code Hosting & AI Repo Self-Evolution",
      "url": "https://tokenman.io",
      "startDate": "2026-03",
      "highlights": ["Tailored highlight text..."],
      "keywords": ["agentic", "infrastructure"]
    }
  ],
  "skills": [
    { "name": "AI & Agentic Systems", "keywords": ["Autonomous Agent Development", "LLM Integration", "RAG Pipelines"] }
  ],
  "education": [
    { "institution": "Georgetown University", "area": "Data Science and Analytics", "studyType": "Master", "startDate": "2023-09", "endDate": "2025-05", "location": "Washington, DC", "score": "Returning Student Scholarship (Top 3%)" }
  ],
  "volunteer": [
    { "organization": "1124 Space", "position": "Volunteer Lead", "startDate": "2024-04", "endDate": "2025-12", "summary": "Led community initiatives..." }
  ],
  "meta": {
    "version": "1.0.0",
    "lastModified": "2026-04-16T03:00:00+00:00",
    "agentfolio": {
      "company": "Cohere",
      "generated_by": "llm_adapt.py v2.0",
      "match_score": {
        "overall": 0.82,
        "by_category": { "ai": 0.9, "fullstack": 0.7, "cloud": 0.8, "methods": 0.6 },
        "matched_keywords": ["Python", "distributed systems"],
        "missing_keywords": ["Ruby", "Kafka"]
      },
      "skill_emphasis": ["Python", "LLM Integration"],
      "section_order": ["basics", "projects", "work", "skills", "education", "volunteer"]
    }
  }
}
```

No `id`, `tags`, or `highlightMeta` in adapted output — those are base resume internals for the LLM to read, not for the frontend to render.

## Changes Required

### Data

- **`data/resume.json`** — rewrite to JSON Resume schema with extensions
- **`data/adapted/*.json`** — regenerated by LLM on next CI run; existing files stay until then

### Python Scripts

- **`scripts/llm_adapt.py`** — update `SYSTEM_PROMPT` to output JSON Resume format with `meta.agentfolio`. Update `VERSION` to `v2.0`. Update constraint references (experience IDs → work IDs, etc.)
- **`scripts/adapt_on_request.py`** — no changes (passes company/role to `generate_adaptation()`)
- **`scripts/adapt_all.py`** — no changes
- **`scripts/adapt_one.py`** — leave as-is (unused by active paths, would need full rewrite)

### Frontend Types (`web/src/types.ts`)

Replace current interfaces with JSON Resume-aligned types:

- `BaseResume` → JSON Resume structure with `basics`, `work`, `projects`, `skills`, `education`, `volunteer`, `meta`
- `AdaptedResume` → complete JSON Resume + `meta.agentfolio`
- `SectionName` → `'basics' | 'work' | 'projects' | 'skills' | 'education' | 'volunteer'`
- Remove old types: `Contact`, `Bullet`, `Experience` (replaced by JSON Resume equivalents)

### Frontend Components

All components update to read from new field paths:

- **`AdaptiveResume.tsx`** — read `basics` for header, `meta.agentfolio.section_order` for ordering. Pass `work`, `projects`, `skills`, `education`, `volunteer` to child components.
- **`SummarySection.tsx`** — read `basics.summary` instead of `adapted.summary`
- **`ExperienceSection.tsx`** — read `work[]` with `.position`, `.name`, `.highlights[]` instead of `.bullets[].text`
- **`ProjectsSection.tsx`** — read `projects[].highlights[]`, `.url`, `.keywords[]`
- **`SkillsSection.tsx`** — read `skills[].keywords` instead of `.items`, `skills[].name` instead of `.label`
- **`EducationSection.tsx`** — read `.institution`, `.studyType`, `.area` instead of `.degree`, `.school`
- **`VolunteeringSection.tsx`** — read `volunteer[].organization` instead of `.org`, `.position` instead of `.title`
- **`MatchScoreBar.tsx`** — read `meta.agentfolio.match_score`
- **`DebugPanel.tsx`** — read `meta.agentfolio.company`, `.generated_by`, `.match_score`
- **`ArchitecturePage.tsx`** — update comparison rendering for new shape

### Tests

- **Python `conftest.py`** — update `base_resume` and `cohere_profile` fixtures
- **Python `test_adapt_one.py`** — update field references to JSON Resume names
- **Python `test_llm_adapt.py`** — update `_valid_adaptation()` to return JSON Resume shape
- **Python `test_adapt_on_request.py`** — update `_fake_adaptation()` to JSON Resume shape
- **Python `test_adapt_all.py`** — update `_fake_result()` to JSON Resume shape
- **Frontend tests** — update all component tests for new prop shapes

## Section Name Mapping

| Old | New (JSON Resume) |
|-----|-------------------|
| `summary` | `basics` |
| `experience` | `work` |
| `projects` | `projects` (unchanged) |
| `skills` | `skills` (unchanged) |
| `education` | `education` (unchanged) |
| `volunteering` | `volunteer` |
