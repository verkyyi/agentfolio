# Remove Self-ID and Live Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the self-id form gate and live-generation UI from the frontend so visitors see the default resume immediately without prompts.

**Architecture:** Delete 6 files (SelfIdPrompt, AdaptationProgress, useAdaptationProgress + their tests). Simplify App.tsx to remove all self-id/live-gen state and branching. Clean up types, githubApi, useAdaptation, and slugs.json. Update PipelineDiagram blurb.

**Tech Stack:** React, TypeScript, Vitest

---

### Task 1: Delete Self-ID and Live-Generation Files

**Files:**
- Delete: `web/src/components/SelfIdPrompt.tsx`
- Delete: `web/src/__tests__/SelfIdPrompt.test.tsx`
- Delete: `web/src/hooks/useAdaptationProgress.ts`
- Delete: `web/src/__tests__/useAdaptationProgress.test.ts`
- Delete: `web/src/components/AdaptationProgress.tsx`
- Delete: `web/src/__tests__/AdaptationProgress.test.tsx`

- [ ] **Step 1: Delete the 6 files**

```bash
git rm web/src/components/SelfIdPrompt.tsx \
       web/src/__tests__/SelfIdPrompt.test.tsx \
       web/src/hooks/useAdaptationProgress.ts \
       web/src/__tests__/useAdaptationProgress.test.ts \
       web/src/components/AdaptationProgress.tsx \
       web/src/__tests__/AdaptationProgress.test.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: delete self-id and live-generation UI files"
```

---

### Task 2: Clean Up types.ts

**Files:**
- Modify: `web/src/types.ts:139-152`

- [ ] **Step 1: Remove `'self-id'` from VisitorContext.source**

Change `VisitorContext.source` from:
```typescript
source: 'slug' | 'self-id' | 'default';
```
to:
```typescript
source: 'slug' | 'default';
```

- [ ] **Step 2: Delete ProgressStep and ProgressComment types**

Remove these lines (146-152):
```typescript
export type ProgressStep = 'jd_parsed' | 'profile_built' | 'adapted' | 'committed';

export type ProgressComment =
  | { status: 'progress'; step: ProgressStep; timestamp: string }
  | { status: 'complete'; adapted_path: string; company_slug: string; timestamp: string }
  | { status: 'rate_limited'; timestamp: string }
  | { status: 'error'; message: string; timestamp: string };
```

- [ ] **Step 3: Verify no remaining references to deleted types**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only from files we haven't cleaned up yet (App.tsx, githubApi.ts, etc.), NOT from types.ts itself.

- [ ] **Step 4: Commit**

```bash
git add web/src/types.ts
git commit -m "chore: remove self-id and progress types from types.ts"
```

---

### Task 3: Clean Up githubApi.ts

**Files:**
- Modify: `web/src/utils/githubApi.ts`
- Modify: `web/src/__tests__/githubApi.test.ts`

- [ ] **Step 1: Delete `findOpenRequestForCompany` and `createAdaptRequest` from githubApi.ts**

Remove the `normalize` helper (lines 8-10), `findOpenRequestForCompany` (lines 29-44), and `createAdaptRequest` (lines 46-69). Also remove the `GithubIssue` import since it's only used by `findOpenRequestForCompany`.

The file should contain only:

```typescript
export interface ApiConfig {
  pat: string;
  repo: string;
}

export function getApiConfig(opts: {
  pat: string | undefined;
  repo: string | undefined;
}): ApiConfig {
  if (!opts.pat) throw new Error('VITE_GITHUB_PAT not configured — live generation unavailable');
  if (!opts.repo) throw new Error('VITE_GITHUB_REPO not configured');
  return { pat: opts.pat, repo: opts.repo };
}

function headers(cfg: ApiConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

export async function fetchIssueComments(
  issueNumber: number,
  cfg: ApiConfig,
): Promise<Array<{ body: string }>> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`comments fetch failed: ${res.status}`);
  return (await res.json()) as Array<{ body: string }>;
}
```

- [ ] **Step 2: Remove deleted function tests from githubApi.test.ts**

Delete the `findOpenRequestForCompany` describe block (lines 26-48) and the `createAdaptRequest` describe block (lines 50-70). Keep `getApiConfig` and `fetchIssueComments` tests. Also remove `findOpenRequestForCompany` and `createAdaptRequest` from the import.

The imports should be:

```typescript
import {
  fetchIssueComments,
  getApiConfig,
} from '../utils/githubApi';
```

And remove the `issues` array constant (lines 9-12) since it was only used by `findOpenRequestForCompany` tests.

- [ ] **Step 3: Run the tests**

```bash
cd web && npx vitest run src/__tests__/githubApi.test.ts
```

Expected: 2 passing tests (getApiConfig, fetchIssueComments).

- [ ] **Step 4: Commit**

```bash
git add web/src/utils/githubApi.ts web/src/__tests__/githubApi.test.ts
git commit -m "chore: remove createAdaptRequest and findOpenRequestForCompany from githubApi"
```

---

### Task 4: Simplify useAdaptation Hook

**Files:**
- Modify: `web/src/hooks/useAdaptation.ts`
- Modify: `web/src/__tests__/useAdaptation.test.ts`

- [ ] **Step 1: Remove needsLiveGeneration from useAdaptation.ts**

Replace the entire file with:

```typescript
import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useAdaptation(company: string | null) {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const slug = normalize(company);

    (async () => {
      try {
        const primaryUrl = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        let res = await fetch(primaryUrl);
        if (!res.ok) {
          const fallbackUrl = `${import.meta.env.BASE_URL}data/adapted/default.json`;
          res = await fetch(fallbackUrl);
          if (!res.ok) {
            throw new Error(`no adaptation available for ${slug} or default`);
          }
        }
        const data = (await res.json()) as AdaptedResume;
        if (cancelled) return;
        setAdapted(data);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => { cancelled = true; };
  }, [company]);

  return { adapted, error };
}
```

- [ ] **Step 2: Remove needsLiveGeneration tests from useAdaptation.test.ts**

Delete the last two test cases (lines 129-139):

```typescript
  it('sets needsLiveGeneration true when primary file is 404 and default is served', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.needsLiveGeneration).toBe(true);
  });

  it('sets needsLiveGeneration false when primary file loads', async () => {
    const { result } = renderHook(() => useAdaptation('cohere'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.needsLiveGeneration).toBe(false);
  });
```

- [ ] **Step 3: Run the tests**

```bash
cd web && npx vitest run src/__tests__/useAdaptation.test.ts
```

Expected: 4 passing tests (null company, fetches adapted, falls back to default, normalizes name).

- [ ] **Step 4: Commit**

```bash
git add web/src/hooks/useAdaptation.ts web/src/__tests__/useAdaptation.test.ts
git commit -m "chore: remove needsLiveGeneration from useAdaptation hook"
```

---

### Task 5: Simplify App.tsx

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire file with:

```tsx
import { useCallback, useMemo } from 'react';
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { useBehaviorTracker } from './hooks/useBehaviorTracker';
import { useChat } from './hooks/useChat';
import { AdaptiveResume } from './components/AdaptiveResume';
import { ChatWidget } from './components/ChatWidget';
import { ArchitecturePage } from './components/ArchitecturePage';
import { getApiConfig } from './utils/githubApi';
import type { SectionName } from './types';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();

  const apiConfig = useMemo(() => {
    try {
      return getApiConfig({
        pat: import.meta.env.VITE_GITHUB_PAT,
        repo: import.meta.env.VITE_GITHUB_REPO,
      });
    } catch {
      return null;
    }
  }, []);

  const { adapted, error: adaptError } = useAdaptation(context?.company ?? null);

  const trackerEnabled = !!apiConfig && !!context && !!adapted;

  const startCtx = useMemo(
    () =>
      adapted && context
        ? {
            company: context.company,
            source: context.source,
            adaptation: adapted.meta?.agentfolio?.company ?? '',
            match_score: adapted.meta?.agentfolio?.match_score?.overall ?? 0,
          }
        : { company: '', source: '', adaptation: '', match_score: 0 },
    [adapted, context],
  );

  const { track } = useBehaviorTracker({
    config: apiConfig ?? { pat: '', repo: '' },
    startCtx,
    enabled: trackerEnabled,
  });

  const onCtaClick = useCallback(
    (target: 'email' | 'linkedin' | 'github') => {
      track({ type: 'cta_click', data: { target }, ts: Date.now() });
    },
    [track],
  );
  const onProjectClick = useCallback(
    (projectId: string, link: 'url' | 'github') => {
      track({ type: 'project_click', data: { project_id: projectId, link }, ts: Date.now() });
    },
    [track],
  );
  const onSectionDwell = useCallback(
    (section: SectionName, ms: number) => {
      track({ type: 'section_dwell', data: { section, ms }, ts: Date.now() });
    },
    [track],
  );

  const onChatQuestion = useCallback(
    (question: string, chatIssueNumber: number) => {
      track({
        type: 'chat_question',
        data: { question, issue_number: chatIssueNumber },
        ts: Date.now(),
      });
    },
    [track],
  );

  const chat = useChat({
    config: apiConfig ?? { pat: '', repo: '' },
    enabled: trackerEnabled,
    onQuestion: onChatQuestion,
  });

  const isArchitecturePath =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '').endsWith('/how-it-works');

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (isArchitecturePath) {
    return <ArchitecturePage compareSlugs={['cohere', 'openai', 'default']} />;
  }

  if (!context || !adapted) return <main>Loading…</main>;

  return (
    <>
      <AdaptiveResume
        adapted={adapted}
        context={context}
        onCtaClick={onCtaClick}
        onProjectClick={onProjectClick}
        onSectionDwell={trackerEnabled ? onSectionDwell : undefined}
      />
      <ChatWidget
        messages={chat.messages}
        thinking={chat.thinking}
        onAsk={chat.ask}
        enabled={trackerEnabled}
      />
    </>
  );
}
```

Key changes:
- Removed imports: `useState`, `useEffect`, `SelfIdPrompt`, `AdaptationProgress`, `useAdaptationProgress`, `createAdaptRequest`, `findOpenRequestForCompany`, `AdaptedResume`
- Removed state: `selfId`, `issueNumber`, `requestError`, `liveAdapted`
- Removed: `effectiveContext` memo (replaced by `context` from `useVisitorContext`)
- Removed: `needsSelfIdForm` check
- Removed: live-generation `useEffect`
- Removed: `useAdaptationProgress` call
- Removed: live-adapted fetch `useEffect`
- Removed: `shownAdapted` (replaced by `adapted`)
- Removed: SelfIdPrompt render block
- Removed: AdaptationProgress + requestError render block
- `useVisitorContext` destructured as `context` instead of `urlContext` (no longer need to distinguish)
- `registry` no longer destructured (not needed without self-id form)
- `useAdaptation` receives `context?.company` directly
- `trackerEnabled` simplified (no `needsSelfIdForm` check)
- `normalize` helper removed (was only used for self-id)

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only unrelated ones).

- [ ] **Step 3: Commit**

```bash
git add web/src/App.tsx
git commit -m "feat: remove self-id form and live-generation from App"
```

---

### Task 6: Update App.test.tsx

**Files:**
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Rewrite App.test.tsx**

Replace the entire file with tests for the new simplified flow:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import type { AdaptedResume, SlugRegistry } from '../types';

function mockAdapted(overrides: Record<string, any> = {}): AdaptedResume {
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
        location: 'Test City',
        startDate: '2024-01',
        highlights: ['Did something great'],
      },
    ],
    projects: [
      {
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        url: 'https://example.com',
        startDate: '2024-01',
        highlights: ['Built something'],
        keywords: ['test'],
      },
    ],
    skills: [
      { id: 'sk1', name: 'Languages', keywords: ['Python', 'TypeScript'] },
    ],
    education: [
      { institution: 'Test University', area: 'CS', studyType: 'BS', location: 'Test City' },
    ],
    volunteer: [],
    meta: {
      version: '1.0.0',
      lastModified: '2026-04-16T00:00:00+00:00',
      agentfolio: {
        company: 'default',
        generated_by: 'test',
        match_score: { overall: 0.5, by_category: { sk1: 0.5 }, matched_keywords: ['Python'], missing_keywords: ['Ruby'] },
        skill_emphasis: ['Python'],
        section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
      },
    },
    ...overrides,
  } as AdaptedResume;
}

const defaultAdapted = mockAdapted({
  basics: {
    name: 'Lianghui Yi',
    email: 'verky.yi@gmail.com',
    summary: 'Default summary',
    location: { city: 'Santa Clara', region: 'CA' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'default',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const cohereAdapted = mockAdapted({
  basics: {
    ...defaultAdapted.basics,
    summary: 'Cohere summary',
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'cohere',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.7, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const slugRegistry: SlugRegistry = {
  'cohere-fde': { company: 'cohere', role: 'FDE, Agentic Platform', created: '2026-04-15', context: 'Applied via Ashby' },
};

beforeEach(() => {
  vi.stubEnv('VITE_GITHUB_PAT', 'test-pat');
  vi.stubEnv('VITE_GITHUB_REPO', 'a/b');

  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('data/slugs.json')) {
      return { ok: true, json: async () => slugRegistry };
    }
    if (url.includes('data/adapted/cohere.json')) {
      return { ok: true, json: async () => cohereAdapted };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('App — default path', () => {
  it('renders default resume immediately without self-id form', async () => {
    window.history.pushState({}, '', '/agentfolio/');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
  });
});

describe('App — slug path', () => {
  it('renders company-specific adaptation for valid slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/cohere-fde');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Cohere summary')).toBeInTheDocument());
  });

  it('falls back to default for unknown slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/unknown-co');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npx vitest run src/__tests__/App.test.tsx
```

Expected: 3 passing tests.

- [ ] **Step 3: Commit**

```bash
git add web/src/__tests__/App.test.tsx
git commit -m "test: rewrite App tests for simplified no-self-id flow"
```

---

### Task 7: Remove General Slug and Update PipelineDiagram

**Files:**
- Modify: `data/slugs.json`
- Modify: `web/src/components/PipelineDiagram.tsx:59-60`

- [ ] **Step 1: Remove general entry from slugs.json**

Remove the line:
```json
"general": { "company": "default", "role": null, "created": "2026-04-15", "context": "LinkedIn profile link" }
```

The file should contain:
```json
{
  "cohere-fde": { "company": "cohere", "role": "FDE, Agentic Platform", "created": "2026-04-15", "context": "Applied via Ashby" },
  "cohere": { "company": "cohere", "role": "FDE, Agentic Platform", "created": "2026-04-16", "context": "Short link from how-it-works" },
  "openai": { "company": "openai", "role": "Forward Deployed Engineer", "created": "2026-04-16", "context": "Short link from how-it-works" },
  "apple": { "company": "apple", "role": "Software Engineer", "created": "2026-04-16", "context": "Backfilled from existing adaptation" }
}
```

- [ ] **Step 2: Update PipelineDiagram blurb**

In `web/src/components/PipelineDiagram.tsx`, change line 60 from:
```typescript
'Detect who is visiting. URL slug, self-identification, or the default profile. Nothing personalised without a source.',
```
to:
```typescript
'Detect who is visiting. URL slug or the default profile. Nothing personalised without a source.',
```

- [ ] **Step 3: Commit**

```bash
git add data/slugs.json web/src/components/PipelineDiagram.tsx
git commit -m "chore: remove general slug and update PipelineDiagram blurb"
```

---

### Task 8: Full Test Suite and Type Check

**Files:** None (verification only)

- [ ] **Step 1: Type-check the entire frontend**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all frontend tests**

```bash
cd web && npx vitest run
```

Expected: all tests pass, no references to deleted modules.

- [ ] **Step 3: Verify no dead imports or references**

```bash
cd web && grep -r "SelfIdPrompt\|useAdaptationProgress\|AdaptationProgress\|createAdaptRequest\|findOpenRequestForCompany\|needsLiveGeneration\|needsSelfIdForm\|ProgressStep\|ProgressComment" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Expected: no matches.

- [ ] **Step 4: Commit any remaining fixes if needed**
