# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate downloadable PDF resumes from adapted JSON Resume files using the `resumed` CLI, with a download button on the site.

**Architecture:** A standalone GitHub Actions workflow (`pdf.yml`) triggers on changes to `data/adapted/*.json`, runs `resumed` with `jsonresume-theme-onepage` to produce PDFs alongside the JSON files. The React app checks for the PDF and renders a download button if available.

**Tech Stack:** `resumed`, `puppeteer`, `jsonresume-theme-onepage` (CI only), React + styled-components (download button)

**Spec:** `docs/superpowers/specs/2026-04-16-pdf-export-design.md`

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/pdf.yml` | Create | Workflow to generate PDFs from adapted JSON |
| `web/src/components/DownloadPdf.tsx` | Create | Download button component |
| `web/src/__tests__/DownloadPdf.test.tsx` | Create | Tests for download button |
| `web/src/App.tsx` | Modify | Add DownloadPdf to the page |
| `web/src/__tests__/App.test.tsx` | Modify | Update App tests for download button |

---

### Task 1: PDF Workflow

**Files:**
- Create: `.github/workflows/pdf.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Generate PDFs

on:
  push:
    branches: [main]
    paths:
      - 'data/adapted/*.json'
  workflow_dispatch:
    inputs:
      slugs:
        description: 'Space-separated slugs to generate PDFs for (e.g. "notion stripe"). Leave empty for all.'
        required: false
        default: ''

permissions:
  contents: write

jobs:
  pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Detect changed JSON files
        id: changes
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            INPUT="${{ github.event.inputs.slugs }}"
            echo "slugs=${INPUT:-all}" >> "$GITHUB_OUTPUT"
          else
            SLUGS=$(git diff --name-only HEAD~1 HEAD -- 'data/adapted/*.json' | sed 's|data/adapted/||;s|\.json$||' | tr '\n' ' ' | xargs)
            echo "slugs=${SLUGS:-all}" >> "$GITHUB_OUTPUT"
          fi
          echo "PDF targets: $(cat "$GITHUB_OUTPUT")"

      - name: Install resumed and theme
        run: npm install -g resumed jsonresume-theme-onepage puppeteer

      - name: Generate PDFs
        run: |
          SLUGS="${{ steps.changes.outputs.slugs }}"
          if [ "$SLUGS" = "all" ]; then
            for json in data/adapted/*.json; do
              slug=$(basename "$json" .json)
              echo "Generating PDF for $slug..."
              resumed export "$json" -t jsonresume-theme-onepage -o "data/adapted/${slug}.pdf" --puppeteer-arg=--no-sandbox
            done
          else
            for slug in $SLUGS; do
              json="data/adapted/${slug}.json"
              if [ -f "$json" ]; then
                echo "Generating PDF for $slug..."
                resumed export "$json" -t jsonresume-theme-onepage -o "data/adapted/${slug}.pdf" --puppeteer-arg=--no-sandbox
              else
                echo "Warning: $json not found, skipping"
              fi
            done
          fi

      - name: Show generated PDFs
        run: ls -la data/adapted/*.pdf 2>/dev/null || echo "No PDFs generated"

      - name: Commit generated PDFs
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/adapted/*.pdf
          if git diff --cached --quiet; then
            echo "no PDF changes"
          else
            git commit -m "chore(pdf): regenerate PDFs"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pdf.yml
git commit -m "ci: add PDF generation workflow"
```

---

### Task 2: Download Button Component (TDD)

**Files:**
- Create: `web/src/__tests__/DownloadPdf.test.tsx`
- Create: `web/src/components/DownloadPdf.tsx`

- [ ] **Step 1: Write the failing tests**

Create `web/src/__tests__/DownloadPdf.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DownloadPdf } from '../components/DownloadPdf';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DownloadPdf', () => {
  it('renders download link when PDF exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));

    render(<DownloadPdf slug="notion" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /download pdf/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expect.stringContaining('notion.pdf'));
      expect(link).toHaveAttribute('download');
    });
  });

  it('renders nothing when PDF does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    const { container } = render(<DownloadPdf slug="unknown" />);

    // Wait for the fetch to complete, then confirm nothing rendered
    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('uses default slug when none provided', async () => {
    const mockFetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', mockFetch);

    render(<DownloadPdf slug={null} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('default.pdf'),
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/__tests__/DownloadPdf.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the DownloadPdf component**

Create `web/src/components/DownloadPdf.tsx`:

```tsx
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const DownloadLink = styled.a`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  padding: 8px 16px;
  background: #2563eb;
  color: #ffffff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  transition: background 150ms ease;

  &:hover {
    background: #1d4ed8;
    color: #ffffff;
  }

  @media print {
    display: none;
  }
`;

export function DownloadPdf({ slug }: { slug: string | null }) {
  const [available, setAvailable] = useState(false);
  const file = slug ?? 'default';
  const pdfUrl = `${import.meta.env.BASE_URL}data/adapted/${file}.pdf`;

  useEffect(() => {
    let cancelled = false;
    fetch(pdfUrl, { method: 'HEAD' }).then((res) => {
      if (!cancelled) setAvailable(res.ok);
    }).catch(() => {
      if (!cancelled) setAvailable(false);
    });
    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (!available) return null;

  return (
    <DownloadLink href={pdfUrl} download>
      Download PDF
    </DownloadLink>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/__tests__/DownloadPdf.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/DownloadPdf.tsx web/src/__tests__/DownloadPdf.test.tsx
git commit -m "feat: add DownloadPdf component with tests"
```

---

### Task 3: Wire DownloadPdf into App

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/hooks/useAdaptation.ts`
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Expose slug from useAdaptation**

Edit `web/src/hooks/useAdaptation.ts` — add `slug` to the return value:

```ts
// Change the return statement at line 39 from:
return { adapted, error };
// To:
return { adapted, error, slug };
```

And add the `slug` state. The full updated hook:

```ts
import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

function parseSlug(pathname: string, basePath: string = '/'): string | null {
  let path = pathname;
  if (basePath !== '/' && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  const segment = path.replace(/^\/+|\/+$/g, '').split('/')[0] || null;
  return segment || null;
}

export function useAdaptation() {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const slug = parseSlug(window.location.pathname, import.meta.env.BASE_URL);

  useEffect(() => {
    let cancelled = false;
    const file = slug ?? 'default';
    const url = `${import.meta.env.BASE_URL}data/adapted/${file}.json`;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('not_found');
        const data = (await res.json()) as AdaptedResume;
        if (cancelled) return;
        setAdapted(data);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return { adapted, error, slug };
}
```

- [ ] **Step 2: Add DownloadPdf to App.tsx**

Update `web/src/App.tsx`:

```tsx
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';

export default function App() {
  const { adapted, error, slug } = useAdaptation();

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

- [ ] **Step 3: Update App tests for the download button fetch**

The App tests stub `fetch` for JSON only. The DownloadPdf component will also call `fetch` for the PDF HEAD check. Update the fetch mock in `web/src/__tests__/App.test.tsx` to handle PDF HEAD requests:

In the `beforeEach` block, update the fetch stub:

```ts
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    // HEAD requests for PDF availability check
    if (init?.method === 'HEAD') {
      return { ok: false, status: 404 };
    }
    if (url.includes('data/adapted/notion.json')) {
      return { ok: true, json: async () => sampleAdapted };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    return { ok: false, status: 404 };
  }));
});
```

- [ ] **Step 4: Run all tests**

Run: `cd web && npx vitest run`
Expected: All tests pass (both App and DownloadPdf test files)

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useAdaptation.ts web/src/App.tsx web/src/__tests__/App.test.tsx
git commit -m "feat: wire DownloadPdf into App with slug from useAdaptation"
```

---

### Task 4: Update CLAUDE.md and Commit Spec

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add PDF info to CLAUDE.md**

Add to the Project Structure section, under the `data/` tree:

```
│   └── adapted/             # Adapted resumes + PDFs (auto-generated)
```

Add a new section after Deployment:

```markdown
## PDF Export

PDFs are generated by `.github/workflows/pdf.yml` when adapted JSON files change. Uses `resumed` with `jsonresume-theme-onepage`. PDFs live alongside JSON in `data/adapted/`.
```

- [ ] **Step 2: Commit everything**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-04-16-pdf-export-design.md
git commit -m "docs: add PDF export spec and update CLAUDE.md"
```
