# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a readonly `/dashboard` route that lets the portfolio owner browse fitted markdown resumes and view inline word-level diffs against the default.

**Architecture:** `/dashboard` is intercepted in `App.tsx` before slug resolution and renders a `Dashboard` component. The dashboard fetches a generated `index.json` manifest to discover fitted resumes, then loads markdown files on demand. Preview uses `react-markdown`; diff uses the `diff` package's `diffWords` to compute inline highlights.

**Tech Stack:** React, TypeScript, styled-components, react-markdown, diff

---

### Task 1: Install dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install react-markdown and diff**

```bash
cd web && npm install react-markdown diff && npm install -D @types/diff
```

- [ ] **Step 2: Verify installation**

```bash
cd web && node -e "require('react-markdown'); require('diff'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore: add react-markdown and diff dependencies"
```

---

### Task 2: Extend copy-data to serve fitted markdown

**Files:**
- Modify: `web/package.json` (the `copy-data` script)

- [ ] **Step 1: Write the test — run copy-data and verify output**

Create `web/src/__tests__/copy-data.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicFitted = join(__dirname, '..', '..', 'public', 'data', 'fitted');

describe('copy-data script', () => {
  beforeAll(() => {
    execSync('npm run copy-data', { cwd: join(__dirname, '..', '..') });
  });

  it('copies fitted markdown files to public/', () => {
    expect(existsSync(join(publicFitted, 'default.md'))).toBe(true);
    expect(existsSync(join(publicFitted, 'notion.md'))).toBe(true);
  });

  it('generates index.json with slug entries', () => {
    const index = JSON.parse(readFileSync(join(publicFitted, 'index.json'), 'utf-8'));
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThanOrEqual(2);
    expect(index).toContainEqual({ slug: 'default', filename: 'default.md' });
    expect(index).toContainEqual({ slug: 'notion', filename: 'notion.md' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/copy-data.test.ts
```

Expected: FAIL — `public/data/fitted/` does not exist yet.

- [ ] **Step 3: Create the copy-data script**

Create `web/scripts/copy-data.cjs`:

```javascript
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dataAdapted = path.join(root, '..', 'data', 'adapted');
const dataFitted = path.join(root, '..', 'data', 'fitted');
const publicAdapted = path.join(root, 'public', 'data', 'adapted');
const publicFitted = path.join(root, 'public', 'data', 'fitted');

// Copy adapted JSON + PDFs (existing behavior)
fs.cpSync(dataAdapted, publicAdapted, { recursive: true });

// Copy fitted markdown + generate index
fs.mkdirSync(publicFitted, { recursive: true });

const entries = [];
if (fs.existsSync(dataFitted)) {
  for (const file of fs.readdirSync(dataFitted)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(dataFitted, file), path.join(publicFitted, file));
    entries.push({ slug: file.replace(/\.md$/, ''), filename: file });
  }
}

fs.writeFileSync(
  path.join(publicFitted, 'index.json'),
  JSON.stringify(entries, null, 2) + '\n'
);
```

- [ ] **Step 4: Update package.json copy-data script**

In `web/package.json`, replace the `copy-data` script:

```json
"copy-data": "node scripts/copy-data.cjs"
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/copy-data.test.ts
```

Expected: PASS

- [ ] **Step 6: Run all existing tests to check for regressions**

```bash
cd web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/scripts/copy-data.cjs web/package.json web/src/__tests__/copy-data.test.ts
git commit -m "feat: extend copy-data to serve fitted markdown and index.json"
```

---

### Task 3: Route /dashboard in App.tsx

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `web/src/__tests__/App.test.tsx`, after the existing describe blocks:

```typescript
describe('App — /dashboard route', () => {
  it('renders dashboard at /dashboard', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Fitted Resumes')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/App.test.tsx
```

Expected: FAIL — "Fitted Resumes" not found (currently renders 404 or tries to load dashboard.json).

- [ ] **Step 3: Add dashboard route to App.tsx**

Replace the contents of `web/src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';
import { Dashboard } from './components/Dashboard';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) {
    return <Dashboard />;
  }

  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

  if (error) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>No resume adaptation exists for this path.</p>
        <a href={import.meta.env.BASE_URL}>Go to homepage</a>
      </main>
    );
  }

  if (!adapted) return <main>Loading…</main>;

  return (
    <>
      <DownloadPdf slug={slug} />
      <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
    </>
  );
}
```

- [ ] **Step 4: Create a placeholder Dashboard component**

Create `web/src/components/Dashboard.tsx`:

```typescript
export function Dashboard() {
  return (
    <main>
      <h1>Fitted Resumes</h1>
      <p>Loading…</p>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/App.test.tsx
```

Expected: PASS (all tests including the new dashboard test).

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/components/Dashboard.tsx web/src/__tests__/App.test.tsx
git commit -m "feat: route /dashboard to Dashboard component"
```

---

### Task 4: DashboardSidebar component

**Files:**
- Create: `web/src/components/DashboardSidebar.tsx`
- Create: `web/src/__tests__/DashboardSidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/DashboardSidebar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardSidebar } from '../components/DashboardSidebar';

const items = [
  { slug: 'default', filename: 'default.md' },
  { slug: 'notion', filename: 'notion.md' },
];

describe('DashboardSidebar', () => {
  it('renders all slugs', () => {
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={() => {}} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('notion')).toBeInTheDocument();
  });

  it('highlights the active slug', () => {
    render(<DashboardSidebar items={items} activeSlug="notion" onSelect={() => {}} />);
    const notionItem = screen.getByText('notion').closest('button');
    expect(notionItem).toHaveAttribute('data-active', 'true');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('notion'));
    expect(onSelect).toHaveBeenCalledWith('notion');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/DashboardSidebar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DashboardSidebar**

Create `web/src/components/DashboardSidebar.tsx`:

```typescript
import styled from 'styled-components';

export interface FittedEntry {
  slug: string;
  filename: string;
}

interface Props {
  items: FittedEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

const Aside = styled.aside`
  width: 220px;
  min-height: 100vh;
  border-right: 1px solid var(--rule);
  padding: 24px 0;
  background: var(--paper-deep);
`;

const Heading = styled.h2`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-mute);
  padding: 0 16px;
  margin: 0 0 12px;
`;

const Item = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 16px;
  background: ${({ $active }) => ($active ? 'var(--highlight)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-ink)' : 'var(--ink-soft)')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  border: none;
  cursor: pointer;
  transition: background 120ms ease;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--highlight)' : 'var(--rule)')};
  }
`;

export function DashboardSidebar({ items, activeSlug, onSelect }: Props) {
  return (
    <Aside>
      <Heading>Fitted Resumes</Heading>
      {items.map((item) => (
        <Item
          key={item.slug}
          $active={item.slug === activeSlug}
          data-active={item.slug === activeSlug}
          onClick={() => onSelect(item.slug)}
        >
          {item.slug}
        </Item>
      ))}
    </Aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/DashboardSidebar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/DashboardSidebar.tsx web/src/__tests__/DashboardSidebar.test.tsx
git commit -m "feat: add DashboardSidebar component"
```

---

### Task 5: FittedPreview component

**Files:**
- Create: `web/src/components/FittedPreview.tsx`
- Create: `web/src/__tests__/FittedPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/FittedPreview.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FittedPreview } from '../components/FittedPreview';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('data/fitted/notion.md')) {
      return { ok: true, text: async () => '# Alex Chen\n\nSenior Data Infrastructure Engineer' };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FittedPreview', () => {
  it('renders markdown content for a slug', async () => {
    render(<FittedPreview slug="notion" />);
    await waitFor(() => expect(screen.getByText('Alex Chen')).toBeInTheDocument());
    expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    render(<FittedPreview slug="nonexistent" />);
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/FittedPreview.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FittedPreview**

Create `web/src/components/FittedPreview.tsx`:

```typescript
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import styled from 'styled-components';

interface Props {
  slug: string;
}

const Container = styled.div`
  padding: 32px 40px;
  max-width: 800px;
  font-size: 15px;
  line-height: 1.7;

  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 24px 0 8px; border-bottom: 1px solid var(--rule); padding-bottom: 4px; }
  h3 { font-size: 15px; margin: 16px 0 4px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  p { margin: 8px 0; }
`;

const ErrorMsg = styled.p`
  color: var(--accent);
  font-style: italic;
`;

export function FittedPreview({ slug }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(false);

    const url = `${import.meta.env.BASE_URL}data/fitted/${slug}.md`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('not_found');
        return res.text();
      })
      .then((text) => { if (!cancelled) setContent(text); })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <Container><ErrorMsg>Failed to load {slug}.md</ErrorMsg></Container>;
  if (content === null) return <Container>Loading…</Container>;

  return (
    <Container>
      <Markdown>{content}</Markdown>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/FittedPreview.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/FittedPreview.tsx web/src/__tests__/FittedPreview.test.tsx
git commit -m "feat: add FittedPreview component"
```

---

### Task 6: FittedDiff component

**Files:**
- Create: `web/src/components/FittedDiff.tsx`
- Create: `web/src/__tests__/FittedDiff.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/FittedDiff.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FittedDiff } from '../components/FittedDiff';

const defaultMd = '# Alex Chen\n\nSenior Software Engineer with experience in full-stack development.';
const notionMd = '# Alex Chen\n\nSenior Data Infrastructure Engineer with experience in large-scale pipelines.';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('data/fitted/default.md')) {
      return { ok: true, text: async () => defaultMd };
    }
    if (url.includes('data/fitted/notion.md')) {
      return { ok: true, text: async () => notionMd };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FittedDiff', () => {
  it('renders inline diff with additions and deletions', async () => {
    render(<FittedDiff slug="notion" />);
    await waitFor(() => {
      expect(screen.getByText(/Data Infrastructure/)).toBeInTheDocument();
    });
    // Check that diff markers exist (added and removed spans)
    const container = screen.getByTestId('diff-container');
    const added = container.querySelectorAll('[data-diff="added"]');
    const removed = container.querySelectorAll('[data-diff="removed"]');
    expect(added.length).toBeGreaterThan(0);
    expect(removed.length).toBeGreaterThan(0);
  });

  it('shows disabled message for default slug', () => {
    render(<FittedDiff slug="default" />);
    expect(screen.getByText(/nothing to compare/i)).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    render(<FittedDiff slug="nonexistent" />);
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/FittedDiff.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FittedDiff**

Create `web/src/components/FittedDiff.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { diffWords } from 'diff';
import styled from 'styled-components';

interface Props {
  slug: string;
}

const Container = styled.div`
  padding: 32px 40px;
  max-width: 800px;
  font-size: 14px;
  line-height: 1.8;
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Added = styled.span`
  background: rgba(40, 167, 69, 0.18);
  color: #1a7f37;
  border-radius: 2px;
  padding: 1px 2px;
`;

const Removed = styled.span`
  background: rgba(207, 58, 42, 0.14);
  color: var(--accent);
  text-decoration: line-through;
  border-radius: 2px;
  padding: 1px 2px;
`;

const Unchanged = styled.span`
  color: var(--ink-soft);
`;

const DisabledMsg = styled.p`
  color: var(--ink-mute);
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const ErrorMsg = styled.p`
  color: var(--accent);
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

export function FittedDiff({ slug }: Props) {
  const [parts, setParts] = useState<Array<{ value: string; added?: boolean; removed?: boolean }> | null>(null);
  const [error, setError] = useState(false);
  const isDefault = slug === 'default';

  useEffect(() => {
    if (isDefault) return;
    let cancelled = false;
    setParts(null);
    setError(false);

    const baseUrl = `${import.meta.env.BASE_URL}data/fitted/default.md`;
    const fittedUrl = `${import.meta.env.BASE_URL}data/fitted/${slug}.md`;

    Promise.all([
      fetch(baseUrl).then((r) => { if (!r.ok) throw new Error('not_found'); return r.text(); }),
      fetch(fittedUrl).then((r) => { if (!r.ok) throw new Error('not_found'); return r.text(); }),
    ])
      .then(([baseText, fittedText]) => {
        if (cancelled) return;
        setParts(diffWords(baseText, fittedText));
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [slug]);

  if (isDefault) return <Container><DisabledMsg>Nothing to compare — this is the base resume.</DisabledMsg></Container>;
  if (error) return <Container><ErrorMsg>Failed to load diff for {slug}.md</ErrorMsg></Container>;
  if (parts === null) return <Container>Loading…</Container>;

  return (
    <Container data-testid="diff-container">
      {parts.map((part, i) => {
        if (part.added) return <Added key={i} data-diff="added">{part.value}</Added>;
        if (part.removed) return <Removed key={i} data-diff="removed">{part.value}</Removed>;
        return <Unchanged key={i}>{part.value}</Unchanged>;
      })}
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/FittedDiff.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/FittedDiff.tsx web/src/__tests__/FittedDiff.test.tsx
git commit -m "feat: add FittedDiff component with inline word-level highlights"
```

---

### Task 7: Wire up Dashboard with sidebar, preview, and diff

**Files:**
- Modify: `web/src/components/Dashboard.tsx`
- Create: `web/src/__tests__/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/Dashboard.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../components/Dashboard';

const indexJson = [
  { slug: 'default', filename: 'default.md' },
  { slug: 'notion', filename: 'notion.md' },
];

const defaultMd = '# Alex Chen\n\nSenior Software Engineer';
const notionMd = '# Alex Chen\n\nSenior Data Infrastructure Engineer';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('data/fitted/index.json')) {
      return { ok: true, json: async () => indexJson };
    }
    if (url.includes('data/fitted/default.md')) {
      return { ok: true, text: async () => defaultMd };
    }
    if (url.includes('data/fitted/notion.md')) {
      return { ok: true, text: async () => notionMd };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('loads manifest and renders sidebar with first item selected', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('default')).toBeInTheDocument());
    expect(screen.getByText('notion')).toBeInTheDocument();
    // First item preview loads
    await waitFor(() => expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument());
  });

  it('switches to another resume when sidebar item is clicked', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('notion')).toBeInTheDocument());
    await userEvent.click(screen.getByText('notion'));
    await waitFor(() => expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument());
  });

  it('switches between Preview and Diff tabs', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('notion')).toBeInTheDocument());
    await userEvent.click(screen.getByText('notion'));
    await waitFor(() => expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Diff' }));
    await waitFor(() => expect(screen.getByTestId('diff-container')).toBeInTheDocument());
  });

  it('shows empty state when index is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('index.json')) return { ok: true, json: async () => [] };
      return { ok: false, status: 404 };
    }));
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/no fitted resumes/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/__tests__/Dashboard.test.tsx
```

Expected: FAIL — Dashboard doesn't fetch manifest or render sidebar yet.

- [ ] **Step 3: Implement Dashboard**

Replace `web/src/components/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { DashboardSidebar, type FittedEntry } from './DashboardSidebar';
import { FittedPreview } from './FittedPreview';
import { FittedDiff } from './FittedDiff';

type Tab = 'preview' | 'diff';

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--rule);
  padding: 0 40px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? 'var(--accent-ink)' : 'var(--ink-mute)')};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent)' : 'transparent')};
  cursor: pointer;
  transition: color 120ms ease;

  &:hover {
    color: var(--ink);
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--ink-mute);
  font-size: 15px;
`;

export function Dashboard() {
  const [items, setItems] = useState<FittedEntry[] | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('preview');

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/fitted/index.json`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FittedEntry[]) => {
        setItems(data);
        if (data.length > 0) setActiveSlug(data[0].slug);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <EmptyState>Loading…</EmptyState>;
  if (items.length === 0) return <EmptyState>No fitted resumes. Run /fit to generate.</EmptyState>;

  const isDiffDisabled = activeSlug === 'default';

  return (
    <Layout>
      <DashboardSidebar items={items} activeSlug={activeSlug!} onSelect={(slug) => { setActiveSlug(slug); setTab('preview'); }} />
      <Main>
        <TabBar>
          <TabButton $active={tab === 'preview'} onClick={() => setTab('preview')}>Preview</TabButton>
          <TabButton
            $active={tab === 'diff'}
            onClick={() => !isDiffDisabled && setTab('diff')}
            disabled={isDiffDisabled}
            style={isDiffDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            Diff
          </TabButton>
        </TabBar>
        {activeSlug && tab === 'preview' && <FittedPreview slug={activeSlug} />}
        {activeSlug && tab === 'diff' && <FittedDiff slug={activeSlug} />}
      </Main>
    </Layout>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npx vitest run src/__tests__/Dashboard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run all tests**

```bash
cd web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Dashboard.tsx web/src/__tests__/Dashboard.test.tsx
git commit -m "feat: wire up Dashboard with sidebar, preview, and diff tabs"
```

---

### Task 8: Manual smoke test

**Files:** None (verification only)

- [ ] **Step 1: Run dev server**

```bash
cd web && npm run dev
```

- [ ] **Step 2: Verify resume pages still work**

Open `http://localhost:5173/` — should render the default resume.
Open `http://localhost:5173/notion` — should render the Notion-adapted resume.
Open `http://localhost:5173/unknown` — should show 404.

- [ ] **Step 3: Verify dashboard**

Open `http://localhost:5173/dashboard`:
- Sidebar lists `default` and `notion`
- `default` is selected by default, Preview tab shows rendered markdown
- Click `notion` — Preview updates to show Notion-fitted content
- Click `Diff` tab — inline word-level diff with green additions and red strikethrough deletions
- Click back to `default` — Diff tab is disabled
- Empty state: temporarily rename `data/fitted/` and reload — should show "No fitted resumes" message

- [ ] **Step 4: Commit any fixes if needed**

Only if smoke testing reveals issues. Otherwise skip.
