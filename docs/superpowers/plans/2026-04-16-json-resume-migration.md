# JSON Resume Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate data/resume.json and adapted output to JSON Resume standard schema, enabling ecosystem compatibility while preserving AgentFolio adaptation features.

**Architecture:** Base resume uses JSON Resume with custom extensions (id, tags, highlightMeta) in `data/resume.json`. Adapted output is a complete, self-contained JSON Resume with AgentFolio metadata in `meta.agentfolio`. The frontend simplifies from combining base+adapted to rendering a single adapted document. The LLM prompt updates to output the new schema.

**Tech Stack:** Python 3.11, TypeScript/React (Vite), vitest, pytest

**Key simplification:** Since the adapted resume is now a complete document, the frontend no longer needs the `base` resume for rendering. `AdaptiveResume` takes one document instead of two. `useAdaptation` no longer fetches `resume.json`.

---

### Task 1: Rewrite `data/resume.json` to JSON Resume schema

**Files:**
- Modify: `data/resume.json`
- Modify: `data/adapted/default.json`

This is a pure data transformation — restructure the existing resume data into JSON Resume format with our custom extensions.

- [ ] **Step 1: Rewrite `data/resume.json`**

Transform the current schema to JSON Resume. Key changes:
- `name` + `contact` → `basics` object with `name`, `label`, `email`, `phone`, `location`, `profiles`
- `experience[]` → `work[]` with `position` (was `title`), `name` (was `company`), `startDate`/`endDate` (was `dates`), `highlights[]` (was `bullets[].text`), `highlightMeta[]` (was `bullets` metadata), `description` (was `subtitle`)
- `projects[].tagline` → `projects[].description`, `projects[].tags` → `projects[].keywords`, `projects[].bullets[].text` → `projects[].highlights[]`
- `skills.groups[]` → `skills[]` with `name` (was `label`), `keywords` (was `items`)
- `education[].school` → `education[].institution`, `education[].degree` split to `studyType` + `area`, `education[].note` → `education[].score`
- `volunteering[]` → `volunteer[]` with `organization` (was `org`), `position` (was `title`)
- `summary_template` + `summary_defaults` → `meta.agentfolio.summary_template` + `summary_defaults`
- Date format changes: `"03/2024 – Present"` → `startDate: "2024-03"` (no `endDate` for current)
- Keep custom extension fields: `id` on work/projects/skills entries, `highlightMeta` on work entries, `github` on project entries

The full file content is too large to inline here. The implementer should transform the current `data/resume.json` field by field following the mapping table in the spec at `docs/superpowers/specs/2026-04-16-json-resume-migration-design.md`. Read the current file, apply the mapping, write the new version.

- [ ] **Step 2: Rewrite `data/adapted/default.json` to complete JSON Resume format**

The default adaptation is the generic resume for visitors with no company context. Transform it into a complete JSON Resume document:
- Copy all `basics`, `work`, `projects`, `skills`, `education`, `volunteer` from the restructured `resume.json`
- For `work[].highlights`, use the original (non-adapted) bullet text
- Strip custom extensions (`id`, `highlightMeta`, `github`) from adapted output — these are base resume internals
- Set `basics.summary` to the default summary (render the template with default values)
- Add `meta.agentfolio` with: `company: "default"`, `generated_by: "manual"`, `match_score: { overall: 0, by_category: {}, matched_keywords: [], missing_keywords: [] }`, `skill_emphasis: []`, `section_order: ["basics", "work", "projects", "skills", "education", "volunteer"]`
- Set `meta.version: "1.0.0"` and `meta.lastModified` to current ISO timestamp

- [ ] **Step 3: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('data/resume.json')); json.load(open('data/adapted/default.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add data/resume.json data/adapted/default.json
git commit -m "chore(data): migrate resume.json and default adaptation to JSON Resume schema"
```

---

### Task 2: Update `scripts/llm_adapt.py` for JSON Resume output

**Files:**
- Modify: `scripts/llm_adapt.py`
- Modify: `scripts/tests/test_llm_adapt.py`

- [ ] **Step 1: Update `_valid_adaptation()` in tests to return JSON Resume shape**

The test helper `_valid_adaptation()` must return a complete JSON Resume document matching the new schema. Update it to return:

```python
def _valid_adaptation():
    resume = _load_resume()
    return {
        "basics": {
            "name": resume["basics"]["name"],
            "label": "Forward Deployed Engineer",
            "email": resume["basics"]["email"],
            "phone": resume["basics"].get("phone", ""),
            "summary": "A tailored summary for Stripe.",
            "location": resume["basics"]["location"],
            "profiles": resume["basics"]["profiles"],
        },
        "work": [
            {
                "name": w["name"],
                "position": w["position"],
                "location": w.get("location", ""),
                "startDate": w["startDate"],
                "highlights": w["highlights"],
            }
            for w in resume["work"]
        ],
        "projects": [
            {
                "name": p["name"],
                "description": p.get("description", ""),
                "url": p.get("url", ""),
                "startDate": p.get("startDate", ""),
                "highlights": p.get("highlights", []),
                "keywords": p.get("keywords", []),
            }
            for p in resume["projects"]
        ],
        "skills": [
            {"name": s["name"], "keywords": s["keywords"]}
            for s in resume["skills"]
        ],
        "education": resume.get("education", []),
        "volunteer": resume.get("volunteer", []),
        "meta": {
            "version": "1.0.0",
            "lastModified": "2026-04-16T00:00:00+00:00",
            "agentfolio": {
                "company": "Stripe",
                "generated_by": "llm_adapt.py v2.0",
                "match_score": {
                    "overall": 0.75,
                    "by_category": {s["id"]: 0.5 for s in resume["skills"]},
                    "matched_keywords": ["Python"],
                    "missing_keywords": ["Ruby"],
                },
                "skill_emphasis": [resume["skills"][0]["keywords"][0]],
                "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
            },
        },
    }
```

Update test assertions to check for `result["basics"]["summary"]` instead of `result["summary"]`, and `result["meta"]["agentfolio"]["match_score"]` instead of `result["match_score"]`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/dev/projects/agentfolio && python3 -m pytest scripts/tests/test_llm_adapt.py -v`
Expected: FAIL — old assertions don't match new shape

- [ ] **Step 3: Update `llm_adapt.py`**

Update `VERSION` to `"llm_adapt.py v2.0"`.

Replace `SYSTEM_PROMPT` with a new prompt that:
- Outputs a complete JSON Resume document
- Uses `basics.summary` for the tailored summary
- Uses `work[]` with `name`, `position`, `location`, `startDate`, `highlights[]`
- Uses `projects[]` with `name`, `description`, `url`, `startDate`, `highlights[]`, `keywords[]`
- Uses `skills[]` with `name`, `keywords[]`
- Uses `education[]` and `volunteer[]` copied from the base
- Uses `meta.agentfolio` for: `company`, `generated_by`, `match_score`, `skill_emphasis`, `section_order`
- Constraints reference `work[].id` instead of experience IDs, etc.

Update `_extract_ids()` to extract IDs from JSON Resume field names:
- `work[].id` instead of `experience[].id`
- `work[].highlightMeta[].id` instead of `experience[].bullets[].id`
- `projects[].id` from projects
- `skills[].id` from skills

Update `generate_adaptation()`:
- After parsing the LLM response, set `result["meta"]["agentfolio"]["generated_by"] = VERSION`
- Set `result["meta"]["lastModified"]` to current timestamp

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/dev/projects/agentfolio && python3 -m pytest scripts/tests/test_llm_adapt.py -v`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/llm_adapt.py scripts/tests/test_llm_adapt.py
git commit -m "feat(adapt): update llm_adapt prompt for JSON Resume output"
```

---

### Task 3: Update Python test fixtures and remaining tests

**Files:**
- Modify: `scripts/tests/conftest.py`
- Modify: `scripts/tests/test_adapt_on_request.py`
- Modify: `scripts/tests/test_adapt_all.py`
- Modify: `scripts/tests/test_adapt_one.py`

- [ ] **Step 1: Update `conftest.py` fixtures**

Update `base_resume` fixture to return JSON Resume format (or keep loading from the now-updated `data/resume.json`).

Update `cohere_profile` — this is now just `{"company": "Cohere", "role": "FDE, Agentic Platform"}` (already done from prior migration). Verify it matches.

- [ ] **Step 2: Update `test_adapt_on_request.py`**

Update `_fake_adaptation()` to return JSON Resume shape — a complete document with `basics`, `work`, `projects`, `skills`, `education`, `volunteer`, `meta.agentfolio`.

Update assertions to check new paths:
- `adapted["basics"]["summary"]` instead of `adapted["summary"]`
- `adapted["meta"]["agentfolio"]["match_score"]` instead of `adapted["match_score"]`

- [ ] **Step 3: Update `test_adapt_all.py`**

Update `_fake_result(company)` to return JSON Resume shape.

- [ ] **Step 4: Update `test_adapt_one.py`**

These tests use the old `adapt()` function with old field names from resume.json. Since `resume.json` has changed to JSON Resume format, and `adapt_one.py` is unused by active paths, the simplest approach is to update the test fixture in conftest to provide old-format data that `adapt_one.py` still expects, OR skip/remove these tests since `adapt_one.py` is dead code.

Recommended: Keep `base_resume` fixture loading from the live file. The `adapt_one.py` tests that depend on old field names (`experience`, `bullets`, `skills.groups`) will break. Since `adapt_one.py` is no longer used by any active path, mark failing tests with `@pytest.mark.skip(reason="adapt_one uses legacy schema")` rather than rewriting them.

- [ ] **Step 5: Run all Python tests**

Run: `cd /home/dev/projects/agentfolio && python3 -m pytest scripts/tests/ -v`
Expected: all non-skipped tests PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/tests/
git commit -m "fix(tests): update Python test fixtures for JSON Resume schema"
```

---

### Task 4: Update frontend types (`web/src/types.ts`)

**Files:**
- Modify: `web/src/types.ts`

- [ ] **Step 1: Replace resume-related interfaces**

Replace the current types with JSON Resume-aligned interfaces. Keep all non-resume types unchanged (SlugEntry, VisitorContext, ProgressStep, AnalyticsEvent, etc.).

```typescript
// JSON Resume standard types
export interface Location {
  city: string;
  region?: string;
  countryCode?: string;
}

export interface Profile {
  network: string;
  url: string;
  username?: string;
}

export interface Basics {
  name: string;
  label?: string;
  email: string;
  phone?: string;
  summary?: string;
  location: Location;
  profiles: Profile[];
}

export interface HighlightMeta {
  id: string;
  tags: string[];
}

export interface Work {
  id?: string;
  name: string;
  position: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  highlights: string[];
  highlightMeta?: HighlightMeta[];
}

export interface ResumeProject {
  id?: string;
  name: string;
  description: string;
  url?: string;
  github?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
  keywords: string[];
}

export interface Skill {
  id?: string;
  name: string;
  keywords: string[];
}

export interface Education {
  institution: string;
  area: string;
  studyType: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  score?: string;
}

export interface Volunteer {
  organization: string;
  position: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  summary?: string;
}

export interface MatchScore {
  overall: number;
  by_category: Record<string, number>;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface AgentfolioMeta {
  company?: string;
  generated_by?: string;
  summary_template?: string;
  summary_defaults?: Record<string, string>;
  match_score?: MatchScore;
  skill_emphasis?: string[];
  section_order?: SectionName[];
}

export interface Meta {
  version?: string;
  lastModified?: string;
  agentfolio?: AgentfolioMeta;
}

export type SectionName =
  | 'basics'
  | 'work'
  | 'projects'
  | 'skills'
  | 'education'
  | 'volunteer';

// BaseResume = JSON Resume with extensions (used by LLM as input)
export interface BaseResume {
  basics: Basics;
  work: Work[];
  projects: ResumeProject[];
  skills: Skill[];
  education: Education[];
  volunteer: Volunteer[];
  meta?: Meta;
}

// AdaptedResume = complete JSON Resume (rendered by frontend)
export interface AdaptedResume {
  basics: Basics;
  work: Work[];
  projects: ResumeProject[];
  skills: Skill[];
  education: Education[];
  volunteer: Volunteer[];
  meta: Meta;
}
```

Remove old types: `Contact`, `Bullet`, `Experience`, `Project`, `SkillGroup`, `Volunteering`.

Keep `ResumeProject` (not `Project`) to avoid collision with any other `Project` usage.

- [ ] **Step 2: Verify types compile**

Run: `cd /home/dev/projects/agentfolio/web && npx tsc --noEmit 2>&1 | head -30`
Expected: Many errors from components still using old types (this is expected — components are updated in Tasks 5-6)

- [ ] **Step 3: Commit**

```bash
git add web/src/types.ts
git commit -m "feat(web): update TypeScript types for JSON Resume schema"
```

---

### Task 5: Update section components

**Files:**
- Modify: `web/src/components/SummarySection.tsx`
- Modify: `web/src/components/ExperienceSection.tsx`
- Modify: `web/src/components/ProjectsSection.tsx`
- Modify: `web/src/components/SkillsSection.tsx`
- Modify: `web/src/components/EducationSection.tsx`
- Modify: `web/src/components/VolunteeringSection.tsx`

- [ ] **Step 1: Update SummarySection**

No change needed — it already takes `summary: string` which now comes from `adapted.basics.summary`.

- [ ] **Step 2: Update ExperienceSection**

The component now receives `work: Work[]` directly (already ordered and with final highlight text). No more ID-based ordering or bullet overrides — the adapted resume has everything materialized.

```tsx
import type { Work } from '../types';

interface Props {
  work: Work[];
}

export function ExperienceSection({ work }: Props) {
  return (
    <section aria-label="Experience">
      <h2>Experience</h2>
      {work.map((w, i) => (
        <article key={w.id ?? i}>
          <header>
            <h3>
              {w.position} · {w.name}
            </h3>
            <p>
              {w.location}{w.location && w.startDate && ' · '}{w.startDate}{w.endDate ? ` – ${w.endDate}` : w.startDate ? ' – Present' : ''}
            </p>
            {w.description && <p>{w.description}</p>}
          </header>
          <ul>
            {w.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Update ProjectsSection**

Now receives `projects: ResumeProject[]` directly. No more ID-based ordering.

```tsx
import type { ResumeProject } from '../types';

interface Props {
  projects: ResumeProject[];
  onProjectClick?: (projectName: string, link: 'url' | 'github') => void;
}

export function ProjectsSection({ projects, onProjectClick }: Props) {
  return (
    <section aria-label="Projects">
      <h2>Projects</h2>
      {projects.map((p, i) => (
        <article key={p.id ?? i}>
          <header>
            <h3>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onProjectClick?.(p.id ?? p.name, 'url')}
                >
                  {p.name}
                </a>
              ) : (
                p.name
              )}
            </h3>
            <p>
              {p.description}{p.startDate && ` · ${p.startDate}`}{p.endDate ? ` – ${p.endDate}` : p.startDate ? ' – Present' : ''}
            </p>
          </header>
          <ul>
            {p.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Update SkillsSection**

Now receives `skills: Skill[]` and `emphasis: string[]`.

```tsx
import type { Skill } from '../types';

interface Props {
  skills: Skill[];
  emphasis: string[];
}

export function SkillsSection({ skills, emphasis }: Props) {
  const emphasisSet = new Set(emphasis);
  return (
    <section aria-label="Skills">
      <h2>Skills</h2>
      {skills.map((s, i) => (
        <div key={s.id ?? i}>
          <h3>{s.name}</h3>
          <ul>
            {s.keywords.map((kw) => (
              <li
                key={kw}
                data-emphasized={emphasisSet.has(kw) ? 'true' : 'false'}
              >
                {kw}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Update EducationSection**

```tsx
import type { Education } from '../types';

interface Props {
  education: Education[];
}

export function EducationSection({ education }: Props) {
  return (
    <section aria-label="Education">
      <h2>Education</h2>
      <ul>
        {education.map((e, i) => (
          <li key={i}>
            <strong>{e.studyType && e.area ? `${e.studyType} of ${e.area}` : e.area || e.studyType}</strong> — {e.institution}
            {e.location && ` · ${e.location}`}
            {e.startDate && ` · ${e.startDate}`}{e.endDate && ` – ${e.endDate}`}
            {e.score && ` · ${e.score}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Update VolunteeringSection**

```tsx
import type { Volunteer } from '../types';

interface Props {
  items: Volunteer[];
}

export function VolunteeringSection({ items }: Props) {
  return (
    <section aria-label="Volunteering">
      <h2>Volunteering</h2>
      <ul>
        {items.map((v, i) => (
          <li key={i}>
            <strong>{v.position}</strong> · {v.organization}{v.startDate && ` · ${v.startDate}`}{v.endDate && ` – ${v.endDate}`}
            {v.summary && <p>{v.summary}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ExperienceSection.tsx web/src/components/ProjectsSection.tsx web/src/components/SkillsSection.tsx web/src/components/EducationSection.tsx web/src/components/VolunteeringSection.tsx
git commit -m "feat(web): update section components for JSON Resume schema"
```

---

### Task 6: Update AdaptiveResume, DebugPanel, MatchScoreBar, useAdaptation, and App

**Files:**
- Modify: `web/src/components/AdaptiveResume.tsx`
- Modify: `web/src/components/DebugPanel.tsx`
- Modify: `web/src/components/MatchScoreBar.tsx`
- Modify: `web/src/hooks/useAdaptation.ts`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Update MatchScoreBar**

Now reads from `MatchScore` type (unchanged interface, but accessed via `meta.agentfolio.match_score` — the parent passes it). No change needed to this component itself.

- [ ] **Step 2: Update DebugPanel**

Now reads `meta.agentfolio` fields from the adapted resume:

```tsx
import { useState } from 'react';
import type { AdaptedResume, VisitorContext } from '../types';

interface Props {
  context: VisitorContext;
  adapted: AdaptedResume;
}

export function DebugPanel({ context, adapted }: Props) {
  const [open, setOpen] = useState(false);
  const af = adapted.meta?.agentfolio;
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
        <dd>{af?.company ?? '—'}</dd>
        <dt>Generated</dt>
        <dd>{adapted.meta?.lastModified ?? '—'}</dd>
        <dt>Match Score</dt>
        <dd>{af?.match_score ? Math.round(af.match_score.overall * 100) : 0}%</dd>
      </dl>
    </details>
  );
}
```

- [ ] **Step 3: Update useAdaptation**

Simplify: only fetch the adapted resume (it's now a complete document). No need to fetch `resume.json` at all.

```typescript
import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useAdaptation(company: string | null) {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [needsLiveGeneration, setNeedsLiveGeneration] = useState(false);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const slug = normalize(company);

    (async () => {
      try {
        const primaryUrl = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        let res = await fetch(primaryUrl);
        let fellBack = false;
        if (!res.ok) {
          fellBack = true;
          const fallbackUrl = `${import.meta.env.BASE_URL}data/adapted/default.json`;
          res = await fetch(fallbackUrl);
          if (!res.ok) {
            throw new Error(`no adaptation available for ${slug} or default`);
          }
        }
        const data = (await res.json()) as AdaptedResume;

        if (cancelled) return;
        setAdapted(data);
        setNeedsLiveGeneration(fellBack);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company]);

  return { adapted, error, needsLiveGeneration };
}
```

- [ ] **Step 4: Update AdaptiveResume**

Major simplification — only takes `adapted` (a complete JSON Resume), no `base` needed:

```tsx
import type { AdaptedResume, SectionName, VisitorContext } from '../types';
import { SummarySection } from './SummarySection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { EducationSection } from './EducationSection';
import { VolunteeringSection } from './VolunteeringSection';
import { MatchScoreBar } from './MatchScoreBar';
import { DebugPanel } from './DebugPanel';
import { SectionDwellTracker } from './SectionDwellTracker';

interface Props {
  adapted: AdaptedResume;
  context: VisitorContext;
  onCtaClick?: (target: 'email' | 'linkedin' | 'github') => void;
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
  onSectionDwell?: (section: SectionName, ms: number) => void;
}

export function AdaptiveResume({
  adapted,
  context,
  onCtaClick,
  onProjectClick,
  onSectionDwell,
}: Props) {
  const af = adapted.meta?.agentfolio;
  const sectionOrder = af?.section_order ?? ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'];
  const linkedIn = adapted.basics.profiles.find((p) => p.network === 'LinkedIn');
  const gitHub = adapted.basics.profiles.find((p) => p.network === 'GitHub');

  const renderers: Record<SectionName, () => React.ReactElement> = {
    basics: () => <SummarySection summary={adapted.basics.summary ?? ''} />,
    work: () => <ExperienceSection work={adapted.work} />,
    projects: () => (
      <ProjectsSection
        projects={adapted.projects}
        onProjectClick={onProjectClick}
      />
    ),
    skills: () => (
      <SkillsSection skills={adapted.skills} emphasis={af?.skill_emphasis ?? []} />
    ),
    education: () => <EducationSection education={adapted.education} />,
    volunteer: () => <VolunteeringSection items={adapted.volunteer} />,
  };

  return (
    <main className="resume">
      <header>
        <h1>{adapted.basics.name}</h1>
        <p>
          {adapted.basics.location.city}{adapted.basics.location.region && `, ${adapted.basics.location.region}`} ·{' '}
          <a
            href={`mailto:${adapted.basics.email}`}
            onClick={() => onCtaClick?.('email')}
          >
            {adapted.basics.email}
          </a>{' '}
          {linkedIn && (
            <>
              ·{' '}
              <a href={linkedIn.url} onClick={() => onCtaClick?.('linkedin')}>
                LinkedIn
              </a>{' '}
            </>
          )}
          {gitHub && (
            <>
              ·{' '}
              <a href={gitHub.url} onClick={() => onCtaClick?.('github')}>
                GitHub
              </a>
            </>
          )}
        </p>
        {context.company !== 'default' && af?.match_score && (
          <>
            <DebugPanel context={context} adapted={adapted} />
            <MatchScoreBar score={af.match_score} />
          </>
        )}
      </header>
      {sectionOrder.map((name) => {
        const render = renderers[name];
        if (!render) return null;
        if (onSectionDwell) {
          return (
            <SectionDwellTracker
              key={name}
              name={name}
              onDwell={(section, ms) => onSectionDwell(section as SectionName, ms)}
            >
              {render()}
            </SectionDwellTracker>
          );
        }
        return <div key={name}>{render()}</div>;
      })}
      <footer>
        <a href={`${import.meta.env.BASE_URL}how-it-works`}>How this works →</a>
      </footer>
    </main>
  );
}
```

- [ ] **Step 5: Update App.tsx**

Key changes:
- `useAdaptation` no longer returns `base` — remove all `base` references
- `AdaptiveResume` no longer takes `base` prop
- Match score for analytics comes from `adapted.meta.agentfolio.match_score`
- Loading check: `!adapted` instead of `!base || !adapted`

Update `App.tsx`:
- Remove `base` from `useAdaptation` destructuring
- Update `startCtx` to read from `adapted.meta.agentfolio` instead of `adapted.company` and `adapted.match_score`
- Pass only `adapted` (not `base`) to `AdaptiveResume`
- Update loading condition from `!effectiveContext || !shownAdapted || !base` to `!effectiveContext || !shownAdapted`
- The live-adapted hot-swap flow stays the same (fetch from `progress.adaptedPath`, cast as `AdaptedResume`)

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /home/dev/projects/agentfolio/web && npx tsc --noEmit 2>&1 | head -50`
Expected: may show errors from `PipelineDiagram.tsx` and `AdaptationComparison.tsx` (updated in Task 7) but core resume rendering should compile

- [ ] **Step 7: Commit**

```bash
git add web/src/components/AdaptiveResume.tsx web/src/components/DebugPanel.tsx web/src/hooks/useAdaptation.ts web/src/App.tsx
git commit -m "feat(web): simplify resume rendering for complete JSON Resume adapted output"
```

---

### Task 7: Update PipelineDiagram and AdaptationComparison

**Files:**
- Modify: `web/src/components/PipelineDiagram.tsx`
- Modify: `web/src/components/AdaptationComparison.tsx`
- Modify: `web/src/components/ArchitecturePage.tsx`

These components read adapted resume fields for comparison/visualization. Update field paths:

- [ ] **Step 1: Update PipelineDiagram.tsx**

Replace all adapted field references:
- `a.summary` → `a.basics?.summary ?? ''`
- `a.section_order` → `a.meta?.agentfolio?.section_order ?? []`
- `a.skill_emphasis` → `a.meta?.agentfolio?.skill_emphasis ?? []`
- `a.bullet_overrides` → removed (no longer exists — count `work[].highlights` differences instead, or just remove the bullet rewrite count metric)
- `a.match_score` → `a.meta?.agentfolio?.match_score`
- `a.match_score.overall` → `a.meta?.agentfolio?.match_score?.overall ?? 0`
- `a.match_score.matched_keywords` → `a.meta?.agentfolio?.match_score?.matched_keywords ?? []`

Read the full file, find all references to old adapted fields, and update them. The implementer should read `PipelineDiagram.tsx` (218 lines) and do a systematic find-and-replace of field paths.

- [ ] **Step 2: Update AdaptationComparison.tsx**

Same field path updates as PipelineDiagram:
- `a.summary` → `a.basics?.summary ?? ''`
- `a.section_order` → `a.meta?.agentfolio?.section_order ?? []`
- `a.skill_emphasis` → `a.meta?.agentfolio?.skill_emphasis ?? []`
- `a.bullet_overrides` → remove or replace (count work highlights difference)
- `a.match_score` → `a.meta?.agentfolio?.match_score`

Read the full file (287 lines) and systematically update all references.

- [ ] **Step 3: Update ArchitecturePage.tsx if needed**

This component orchestrates PipelineDiagram and AdaptationComparison. It fetches adapted JSONs and passes them. Since the `AdaptedResume` type changed, verify the fetch/cast works with the new shape. The component should still work since it just fetches JSON and passes it through.

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `cd /home/dev/projects/agentfolio/web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add web/src/components/PipelineDiagram.tsx web/src/components/AdaptationComparison.tsx web/src/components/ArchitecturePage.tsx
git commit -m "feat(web): update analytics components for JSON Resume field paths"
```

---

### Task 8: Update all frontend tests

**Files:**
- Modify: `web/src/__tests__/AdaptiveResume.test.tsx`
- Modify: `web/src/__tests__/App.test.tsx`
- Modify: `web/src/__tests__/AdaptationComparison.test.tsx`
- Modify: `web/src/__tests__/ArchitecturePage.test.tsx`
- Modify: `web/src/__tests__/SelfIdPrompt.test.tsx` (may not need changes)
- Modify: `web/src/__tests__/useVisitorContext.test.ts` (may not need changes)

All test files that create mock `BaseResume` or `AdaptedResume` objects need to use the new JSON Resume shape.

- [ ] **Step 1: Create a shared test helper for mock data**

Create a helper function (in a test utils file or inline) that builds valid mock `AdaptedResume` objects in JSON Resume format:

```typescript
function mockAdapted(overrides: Partial<AdaptedResume> = {}): AdaptedResume {
  return {
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      summary: 'Test summary',
      location: { city: 'Test City', region: 'TC' },
      profiles: [
        { network: 'LinkedIn', url: 'https://linkedin.com/in/test' },
        { network: 'GitHub', url: 'https://github.com/test' },
      ],
    },
    work: [
      {
        id: 'job1',
        name: 'Test Corp',
        position: 'Engineer',
        startDate: '2024-01',
        highlights: ['Did something'],
      },
    ],
    projects: [
      {
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        url: 'https://example.com',
        highlights: ['Built something'],
        keywords: ['test'],
      },
    ],
    skills: [
      { id: 'sk1', name: 'Languages', keywords: ['Python', 'TypeScript'] },
    ],
    education: [
      { institution: 'Test University', area: 'CS', studyType: 'BS' },
    ],
    volunteer: [],
    meta: {
      version: '1.0.0',
      agentfolio: {
        company: 'default',
        generated_by: 'test',
        match_score: { overall: 0.5, by_category: {}, matched_keywords: [], missing_keywords: [] },
        skill_emphasis: [],
        section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
      },
    },
    ...overrides,
  };
}
```

- [ ] **Step 2: Update AdaptiveResume.test.tsx**

- Remove all `baseResume` mock objects and `base` prop
- Replace `adaptedResume` mocks with `mockAdapted()` calls using JSON Resume shape
- Update assertions: `getByText` calls should still work if the rendered text is the same
- Update prop passing: `<AdaptiveResume adapted={adapted} context={context} />` (no `base`)

- [ ] **Step 3: Update App.test.tsx**

- Mock fetch for `data/adapted/{slug}.json` to return JSON Resume shape (no more `data/resume.json` fetch needed)
- Remove `baseResume` mock data
- Update adapted resume mocks to JSON Resume shape
- Update assertions to check for new field paths

- [ ] **Step 4: Update AdaptationComparison.test.tsx and ArchitecturePage.test.tsx**

Update mock adapted data to JSON Resume shape.

- [ ] **Step 5: Run all frontend tests**

Run: `cd /home/dev/projects/agentfolio/web && npx vitest run`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/__tests__/
git commit -m "fix(web): update all frontend tests for JSON Resume schema"
```

---

### Task 9: Full verification and push

- [ ] **Step 1: Run all Python tests**

Run: `cd /home/dev/projects/agentfolio && python3 -m pytest scripts/tests/ -v`
Expected: all non-skipped tests PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd /home/dev/projects/agentfolio/web && npx vitest run`
Expected: all tests PASS

- [ ] **Step 3: TypeScript compiles cleanly**

Run: `cd /home/dev/projects/agentfolio/web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Push**

```bash
git push
```

- [ ] **Step 5: Verify deploy**

Run: `gh run list --limit 3`
Watch the deploy succeed.
