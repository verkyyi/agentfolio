# AgentFolio Phase 2: Live Adaptation Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a visitor self-identifies with a company that has no pre-built adaptation, the browser creates a GitHub Issue tagged `adapt-request`; a workflow runs the adaptation pipeline, posts progress comments, commits the result; the browser polls the issue and hot-swaps the adapted resume when done.

**Architecture:** The live pipeline reuses Phase 1's `adapt()` function. A new CLI (`adapt_on_request.py`) builds a minimal company profile from `default.json` + user-supplied company/role, runs `adapt()`, and writes both `data/companies/<slug>.json` and `data/adapted/<slug>.json`. A new workflow (`adapt-on-request.yml`) triggers on `issues.opened` with the `adapt-request` label, rate-limits, runs the CLI, posts JSON progress comments at each stage, and commits. On the web side, a new hook `useAdaptationProgress` polls issue comments every 5s; `useAdaptation` surfaces a `needsLiveGeneration` flag when the primary file 404s; `App.tsx` orchestrates: show `SelfIdPrompt` when no slug, create Issue on 404, render `AdaptationProgress` overlay while generating, hot-swap when the "complete" comment arrives. A fine-grained PAT with `issues:read+write` scope is exposed as `VITE_GITHUB_PAT` — baked into the client bundle at build time via the `deploy.yml` workflow.

**Tech Stack:** Python 3.11 (stdlib + pytest) · React 18 + TypeScript + Vitest · GitHub Actions · GitHub REST API (issues + comments)

**Out of scope:** JD auto-fetching (Phase 5), LLM-powered summary rewriting (Phase 5), analytics (Phase 3), chat widget (Phase 4), architecture page (Phase 5).

---

## Prerequisites (user action, before executing the plan)

Before Task 11, the user must create a **fine-grained PAT** with these settings:
- **Repository access:** Only `verkyyi/agentfolio`
- **Repository permissions:** `Issues: Read and write` (nothing else)
- **Expiration:** 90 days (renew quarterly)
- Save the token; it will be added to the repo as an Actions secret named `GH_ISSUES_PAT`.

Set the secret via:
```bash
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# (paste PAT when prompted)
```

The Action reads `GH_ISSUES_PAT` and bakes it into the web bundle as `VITE_GITHUB_PAT` at build time. If the PAT is missing or expired, the site falls back to Phase 1 behavior (default adaptation for unknown companies).

---

## File Structure

**Files created or modified in Phase 2:**

```
agentfolio/
├── scripts/
│   ├── adapt_on_request.py                # NEW: single-company CLI
│   └── tests/
│       └── test_adapt_on_request.py       # NEW
├── .github/workflows/
│   ├── adapt-on-request.yml               # NEW: issue-triggered pipeline
│   └── deploy.yml                         # MODIFY: pass VITE_GITHUB_PAT
├── web/
│   ├── .env.example                       # NEW: document VITE_GITHUB_PAT
│   ├── src/
│   │   ├── types.ts                       # MODIFY: add 'self-id' source, progress types
│   │   ├── utils/
│   │   │   └── githubApi.ts               # NEW: Issues/comments helpers
│   │   ├── hooks/
│   │   │   ├── useAdaptation.ts           # MODIFY: add needsLiveGeneration flag
│   │   │   └── useAdaptationProgress.ts   # NEW: poll issue comments
│   │   ├── components/
│   │   │   ├── SelfIdPrompt.tsx           # NEW: company + role form
│   │   │   └── AdaptationProgress.tsx     # NEW: live progress overlay
│   │   ├── App.tsx                        # MODIFY: orchestrate live generation
│   │   └── __tests__/
│   │       ├── githubApi.test.ts          # NEW
│   │       ├── useAdaptationProgress.test.ts  # NEW
│   │       ├── useAdaptation.test.ts      # MODIFY: cover needsLiveGeneration
│   │       ├── SelfIdPrompt.test.tsx      # NEW
│   │       ├── AdaptationProgress.test.tsx # NEW
│   │       └── App.test.tsx               # NEW (integration)
└── README.md                              # MODIFY: PAT setup
```

**Responsibility boundaries:**

- `scripts/adapt_on_request.py` — thin wrapper: build profile dict → call `adapt()` → write files. Reuses Phase 1 functions (`_load`, `_write`, `_normalize_company`, `adapt`) from `adapt_one.py`. No network calls (those are the workflow's job).
- `.github/workflows/adapt-on-request.yml` — orchestration: rate limit, parse title, run CLI, post comments, commit.
- `web/src/utils/githubApi.ts` — pure data layer for the GitHub REST API. No state, no React, no UI.
- `web/src/hooks/useAdaptationProgress.ts` — polls one specific issue. Knows nothing about adaptation logic, only about parsing comment bodies.
- `web/src/hooks/useAdaptation.ts` — Phase 1 behavior plus one extra bit (`needsLiveGeneration`) when primary fetch 404s.
- `web/src/components/SelfIdPrompt.tsx` — form only. Doesn't know about adaptation or issues.
- `web/src/components/AdaptationProgress.tsx` — visual state only. Receives current step as prop.
- `web/src/App.tsx` — the orchestrator. All cross-cutting flow logic lives here.

---

## Comment Protocol

The React app and the Action communicate via JSON-in-issue-comments. Every comment body posted by the Action is a single JSON document on one line. The web hook parses each comment body with `JSON.parse`; non-JSON comments are ignored.

**Comment shape:**

```typescript
type ProgressComment =
  | { status: 'progress'; step: 'jd_parsed' | 'profile_built' | 'adapted' | 'committed'; timestamp: string }
  | { status: 'complete'; adapted_path: string; company_slug: string; timestamp: string }
  | { status: 'rate_limited'; timestamp: string }
  | { status: 'error'; message: string; timestamp: string };
```

**Issue title format (created by browser, parsed by Action):**
```
[adapt] <Company> | <Role>
```

**Issue labels (set by browser):** `['adapt-request']`
**Issue labels after completion (set by Action):** replaced with `['adapt-complete']` (removes `adapt-request` so the same issue doesn't retrigger the workflow).

---

## Task 1: `adapt_on_request.py` — Python CLI with tests

**Files:**
- Create: `/home/dev/projects/agentfolio/scripts/adapt_on_request.py`
- Create: `/home/dev/projects/agentfolio/scripts/tests/test_adapt_on_request.py`

- [ ] **Step 1: Write failing test**

Create `/home/dev/projects/agentfolio/scripts/tests/test_adapt_on_request.py`:

```python
import json
from pathlib import Path

from scripts.adapt_on_request import build_profile, run

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_build_profile_returns_default_shape_with_overrides():
    default = {
        "company": "default",
        "role": None,
        "priority_tags": ["full-stack"],
        "summary_vars": {"focus": "x"},
        "section_order": ["summary"],
        "project_order": [],
        "skill_emphasis": ["Python"],
        "jd_keywords": [],
    }
    profile = build_profile("Stripe", "Forward Deployed Engineer", default)
    assert profile["company"] == "Stripe"
    assert profile["role"] == "Forward Deployed Engineer"
    # unchanged fields are preserved
    assert profile["priority_tags"] == ["full-stack"]
    assert profile["skill_emphasis"] == ["Python"]


def test_build_profile_is_independent_of_input_dict():
    default = {"company": "default", "role": None, "priority_tags": [],
               "summary_vars": {}, "section_order": [], "project_order": [],
               "skill_emphasis": [], "jd_keywords": []}
    profile = build_profile("Stripe", "FDE", default)
    profile["priority_tags"].append("mutated")
    assert default["priority_tags"] == []


def test_run_writes_company_profile_and_adapted_json(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)

    base = (REPO_ROOT / "data" / "resume.json").read_text()
    default = (REPO_ROOT / "data" / "companies" / "default.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "default.json").write_text(default)

    profile_path, adapted_path = run(
        company="Stripe",
        role="Forward Deployed Engineer",
        repo_root=tmp_path,
    )

    assert profile_path == tmp_path / "data" / "companies" / "stripe.json"
    assert adapted_path == tmp_path / "data" / "adapted" / "stripe.json"
    assert profile_path.exists()
    assert adapted_path.exists()

    profile = json.loads(profile_path.read_text())
    assert profile["company"] == "Stripe"
    assert profile["role"] == "Forward Deployed Engineer"

    adapted = json.loads(adapted_path.read_text())
    assert adapted["company"] == "Stripe"
    assert "summary" in adapted
    assert "match_score" in adapted


def test_run_normalizes_company_for_filename(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    default = (REPO_ROOT / "data" / "companies" / "default.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "default.json").write_text(default)

    profile_path, adapted_path = run(
        company="Scale AI",
        role="FDE, GenAI",
        repo_root=tmp_path,
    )
    assert profile_path.name == "scale-ai.json"
    assert adapted_path.name == "scale-ai.json"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/test_adapt_on_request.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.adapt_on_request'`.

- [ ] **Step 3: Implement `adapt_on_request.py`**

Create `/home/dev/projects/agentfolio/scripts/adapt_on_request.py`:

```python
"""Generate an adapted resume on demand from (company, role).

Used by the `adapt-on-request.yml` workflow, triggered by a GitHub Issue.
Writes both the company profile (so future scheduled runs regenerate) and
the adapted JSON (so the next visitor loads instantly).
"""

from __future__ import annotations

import argparse
import copy
import sys
from pathlib import Path

from scripts.adapt_one import _load, _normalize_company, _write, adapt


def build_profile(company: str, role: str, default_profile: dict) -> dict:
    profile = copy.deepcopy(default_profile)
    profile["company"] = company
    profile["role"] = role
    return profile


def run(company: str, role: str, repo_root: Path) -> tuple[Path, Path]:
    base = _load(repo_root / "data" / "resume.json")
    default = _load(repo_root / "data" / "companies" / "default.json")

    profile = build_profile(company, role, default)
    slug = _normalize_company(profile)

    profile_path = repo_root / "data" / "companies" / f"{slug}.json"
    adapted_path = repo_root / "data" / "adapted" / f"{slug}.json"

    _write(profile_path, profile)
    result = adapt(base, profile)
    _write(adapted_path, result)

    return profile_path, adapted_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Adapt on request.")
    parser.add_argument("company")
    parser.add_argument("role")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
    )
    args = parser.parse_args(argv)

    profile_path, adapted_path = run(
        company=args.company,
        role=args.role,
        repo_root=Path(args.repo_root),
    )
    # Workflow greps for these lines
    print(f"PROFILE_PATH={profile_path.relative_to(args.repo_root)}")
    print(f"ADAPTED_PATH={adapted_path.relative_to(args.repo_root)}")
    print(f"COMPANY_SLUG={adapted_path.stem}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/ -v
```
Expected: ALL PASS (15 from Phase 1 + 4 new = 19 tests).

- [ ] **Step 5: Run the CLI to spot-check output**

```bash
cd /home/dev/projects/agentfolio
python3 -m scripts.adapt_on_request "TestCo" "Engineer"
ls data/companies/testco.json data/adapted/testco.json
```
Expected: both files exist. Remove them after spot-check:
```bash
rm data/companies/testco.json data/adapted/testco.json
```

- [ ] **Step 6: Commit**

```bash
git add scripts/adapt_on_request.py scripts/tests/test_adapt_on_request.py
git commit -m "feat(adapt): add adapt_on_request CLI for live generation"
```

---

## Task 2: `.github/workflows/adapt-on-request.yml` — Issue-triggered workflow

**Files:**
- Create: `/home/dev/projects/agentfolio/.github/workflows/adapt-on-request.yml`

- [ ] **Step 1: Create the workflow**

Create `/home/dev/projects/agentfolio/.github/workflows/adapt-on-request.yml`:

```yaml
name: Live Adaptation
on:
  issues:
    types: [opened]

permissions:
  contents: write
  issues: write

jobs:
  adapt:
    if: contains(github.event.issue.labels.*.name, 'adapt-request')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Rate limit check
        id: ratelimit
        uses: actions/github-script@v7
        with:
          script: |
            const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'adapt-request',
              since: oneHourAgo,
              state: 'all',
              per_page: 100,
            });
            if (issues.length > 10) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: JSON.stringify({ status: 'rate_limited', timestamp: new Date().toISOString() }),
              });
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                state: 'closed',
                labels: ['rate-limited'],
              });
              core.setFailed('rate limited');
            }

      - name: Parse request
        id: parse
        uses: actions/github-script@v7
        with:
          script: |
            const title = context.payload.issue.title;
            const match = title.match(/^\[adapt\]\s*(.+?)\s*\|\s*(.+?)\s*$/);
            if (!match) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: JSON.stringify({
                  status: 'error',
                  message: `Could not parse title: ${title}. Expected format: [adapt] Company | Role`,
                  timestamp: new Date().toISOString(),
                }),
              });
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                state: 'closed',
                labels: ['adapt-error'],
              });
              core.setFailed('unparseable title');
              return;
            }
            core.setOutput('company', match[1]);
            core.setOutput('role', match[2]);

      - name: Signal progress — parsed
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: JSON.stringify({ status: 'progress', step: 'jd_parsed', timestamp: new Date().toISOString() }),
            });

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - run: pip install -r scripts/requirements.txt

      - name: Signal progress — profile built
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: JSON.stringify({ status: 'progress', step: 'profile_built', timestamp: new Date().toISOString() }),
            });

      - name: Run adaptation
        id: run
        run: |
          python -m scripts.adapt_on_request "${{ steps.parse.outputs.company }}" "${{ steps.parse.outputs.role }}" > /tmp/adapt.out
          cat /tmp/adapt.out
          # Extract COMPANY_SLUG and ADAPTED_PATH
          SLUG=$(grep '^COMPANY_SLUG=' /tmp/adapt.out | cut -d= -f2)
          PATH_OUT=$(grep '^ADAPTED_PATH=' /tmp/adapt.out | cut -d= -f2)
          echo "slug=$SLUG" >> $GITHUB_OUTPUT
          echo "adapted_path=$PATH_OUT" >> $GITHUB_OUTPUT

      - name: Signal progress — adapted
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: JSON.stringify({ status: 'progress', step: 'adapted', timestamp: new Date().toISOString() }),
            });

      - name: Commit results
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/companies/ data/adapted/
          if git diff --cached --quiet; then
            echo "no changes to commit (already cached?)"
          else
            git commit -m "adapt(live): ${{ steps.parse.outputs.company }}"
            git push
          fi

      - name: Signal progress — committed
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: JSON.stringify({ status: 'progress', step: 'committed', timestamp: new Date().toISOString() }),
            });

      - name: Signal complete and close issue
        uses: actions/github-script@v7
        with:
          script: |
            const slug = '${{ steps.run.outputs.slug }}';
            const adaptedPath = '${{ steps.run.outputs.adapted_path }}';
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: JSON.stringify({
                status: 'complete',
                adapted_path: adaptedPath,
                company_slug: slug,
                timestamp: new Date().toISOString(),
              }),
            });
            await github.rest.issues.update({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              state: 'closed',
              labels: ['adapt-complete'],
            });
```

- [ ] **Step 2: Validate YAML**

```bash
cd /home/dev/projects/agentfolio
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/adapt-on-request.yml')); print('valid yaml')"
```
Expected: `valid yaml`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/adapt-on-request.yml
git commit -m "ci: add adapt-on-request workflow for live generation"
```

Note: we'll manually trigger-test this after Task 11 ships the web side. Workflow won't do anything until an Issue with `adapt-request` label is opened.

---

## Task 3: Pass `VITE_GITHUB_PAT` through `deploy.yml` + `.env.example`

**Files:**
- Modify: `/home/dev/projects/agentfolio/.github/workflows/deploy.yml`
- Create: `/home/dev/projects/agentfolio/web/.env.example`

- [ ] **Step 1: Modify `deploy.yml`**

Find the `Build web` step in `/home/dev/projects/agentfolio/.github/workflows/deploy.yml`. It currently reads:

```yaml
      - name: Build web
        working-directory: web
        run: npm run build
```

Replace it with:

```yaml
      - name: Build web
        working-directory: web
        env:
          VITE_GITHUB_PAT: ${{ secrets.GH_ISSUES_PAT }}
          VITE_GITHUB_REPO: verkyyi/agentfolio
        run: npm run build
```

- [ ] **Step 2: Create `web/.env.example`**

Create `/home/dev/projects/agentfolio/web/.env.example`:

```
# Fine-grained PAT with issues:read+write on verkyyi/agentfolio only.
# For local dev, copy this file to .env.local and fill in the value.
# For production, this is set as an Actions secret named GH_ISSUES_PAT.
VITE_GITHUB_PAT=
VITE_GITHUB_REPO=verkyyi/agentfolio
```

- [ ] **Step 3: Add `.env.local` to `web/.gitignore`**

Read `/home/dev/projects/agentfolio/web/.gitignore`. It currently contains `public/data/`. Append:

```
.env.local
.env*.local
```

Use the Edit tool to replace the single line `public/data/` with:

```
public/data/
.env.local
.env*.local
```

- [ ] **Step 4: Validate YAML**

```bash
cd /home/dev/projects/agentfolio
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('valid yaml')"
```
Expected: `valid yaml`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml web/.env.example web/.gitignore
git commit -m "ci: inject VITE_GITHUB_PAT into web build; add .env.example"
```

---

## Task 4: Extend types

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/types.ts`

- [ ] **Step 1: Read current `types.ts`**

Read `/home/dev/projects/agentfolio/web/src/types.ts`. Find the `VisitorContext` interface and the end-of-file region.

- [ ] **Step 2: Replace `VisitorContext` with the extended version**

Find:

```typescript
export interface VisitorContext {
  source: 'slug' | 'default';
  slug?: string;
  company: string;
  role: string | null;
}
```

Replace with:

```typescript
export interface VisitorContext {
  source: 'slug' | 'self-id' | 'default';
  slug?: string;
  company: string;
  role: string | null;
}

export type ProgressStep = 'jd_parsed' | 'profile_built' | 'adapted' | 'committed';

export type ProgressComment =
  | { status: 'progress'; step: ProgressStep; timestamp: string }
  | { status: 'complete'; adapted_path: string; company_slug: string; timestamp: string }
  | { status: 'rate_limited'; timestamp: string }
  | { status: 'error'; message: string; timestamp: string };

export interface GithubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
}
```

- [ ] **Step 3: Verify tsc**

```bash
cd /home/dev/projects/agentfolio/web
npx tsc --noEmit
```
Expected: exits 0. The existing Phase 1 code doesn't reference these new types yet, but adding `'self-id'` to the union doesn't break any narrowing.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/types.ts
git commit -m "feat(web): extend types with self-id source and ProgressComment"
```

---

## Task 5: `githubApi.ts` helper with tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/utils/githubApi.ts`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/githubApi.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/githubApi.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findOpenRequestForCompany,
  createAdaptRequest,
  fetchIssueComments,
  getApiConfig,
} from '../utils/githubApi';

const issues = [
  { number: 7, title: '[adapt] Stripe | FDE', state: 'open', labels: [{ name: 'adapt-request' }] },
  { number: 8, title: '[adapt] Databricks | FDE', state: 'open', labels: [{ name: 'adapt-request' }] },
];

describe('getApiConfig', () => {
  it('throws when PAT missing', () => {
    expect(() => getApiConfig({ pat: undefined, repo: 'x/y' })).toThrow(/PAT/);
  });

  it('returns config when both provided', () => {
    const cfg = getApiConfig({ pat: 'xxx', repo: 'a/b' });
    expect(cfg.repo).toBe('a/b');
    expect(cfg.pat).toBe('xxx');
  });
});

describe('findOpenRequestForCompany', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => issues,
    })));
  });

  it('returns the issue number when an open request matches the company', async () => {
    const n = await findOpenRequestForCompany('stripe', { pat: 'x', repo: 'a/b' });
    expect(n).toBe(7);
  });

  it('matches case-insensitively and via normalized slug', async () => {
    const n = await findOpenRequestForCompany('STRIPE', { pat: 'x', repo: 'a/b' });
    expect(n).toBe(7);
  });

  it('returns null when no match', async () => {
    const n = await findOpenRequestForCompany('unknown-co', { pat: 'x', repo: 'a/b' });
    expect(n).toBeNull();
  });
});

describe('createAdaptRequest', () => {
  it('POSTs with correct title, body, and labels', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ number: 42 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const n = await createAdaptRequest('Stripe', 'FDE', { pat: 'tok', repo: 'a/b' });
    expect(n).toBe(42);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.title).toBe('[adapt] Stripe | FDE');
    expect(body.labels).toEqual(['adapt-request']);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
  });
});

describe('fetchIssueComments', () => {
  it('GETs comments URL for the issue', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ body: '{"status":"progress"}' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const comments = await fetchIssueComments(42, { pat: 'tok', repo: 'a/b' });
    expect(comments).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues/42/comments?per_page=100');
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- githubApi
```
Expected: FAIL — cannot resolve `../utils/githubApi`.

- [ ] **Step 3: Implement `githubApi.ts`**

Create `/home/dev/projects/agentfolio/web/src/utils/githubApi.ts`:

```typescript
import type { GithubIssue } from '../types';

export interface ApiConfig {
  pat: string;
  repo: string;
}

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
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

export async function findOpenRequestForCompany(
  company: string,
  cfg: ApiConfig,
): Promise<number | null> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues?labels=adapt-request&state=open&per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`issue list failed: ${res.status}`);
  const issues = (await res.json()) as GithubIssue[];
  const slug = normalize(company);
  const found = issues.find((i) => {
    const m = i.title.match(/^\[adapt\]\s*(.+?)\s*\|/);
    if (!m) return false;
    return normalize(m[1]) === slug;
  });
  return found ? found.number : null;
}

export async function createAdaptRequest(
  company: string,
  role: string,
  cfg: ApiConfig,
): Promise<number> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues`;
  const body = {
    title: `[adapt] ${company} | ${role}`,
    body: JSON.stringify({
      company,
      role,
      timestamp: new Date().toISOString(),
    }),
    labels: ['adapt-request'],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create issue failed: ${res.status}`);
  const data = (await res.json()) as { number: number };
  return data.number;
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

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- githubApi
```
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/utils/githubApi.ts web/src/__tests__/githubApi.test.ts
git commit -m "feat(web): add githubApi utility for issues and comments"
```

---

## Task 6: `useAdaptationProgress` hook with tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/hooks/useAdaptationProgress.ts`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/useAdaptationProgress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/useAdaptationProgress.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdaptationProgress } from '../hooks/useAdaptationProgress';

const cfg = { pat: 'tok', repo: 'a/b' };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mockComments(comments: Array<{ body: string }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => comments })),
  );
}

describe('useAdaptationProgress', () => {
  it('returns initial step "waiting" when issueNumber is null', () => {
    const { result } = renderHook(() => useAdaptationProgress(null, cfg));
    expect(result.current.step).toBe('waiting');
    expect(result.current.status).toBe('idle');
  });

  it('advances through progress steps as comments are posted', async () => {
    mockComments([]);
    const { result, rerender } = renderHook(
      ({ n }) => useAdaptationProgress(n, cfg),
      { initialProps: { n: 42 as number | null } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.step).toBe('waiting');

    // First poll: jd_parsed
    mockComments([{ body: JSON.stringify({ status: 'progress', step: 'jd_parsed' }) }]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => expect(result.current.step).toBe('jd_parsed'));

    // Next poll: profile_built
    mockComments([
      { body: JSON.stringify({ status: 'progress', step: 'jd_parsed' }) },
      { body: JSON.stringify({ status: 'progress', step: 'profile_built' }) },
    ]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => expect(result.current.step).toBe('profile_built'));

    rerender({ n: 42 });
  });

  it('surfaces completion with adapted_path', async () => {
    mockComments([
      {
        body: JSON.stringify({
          status: 'complete',
          adapted_path: 'data/adapted/stripe.json',
          company_slug: 'stripe',
        }),
      },
    ]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.adaptedPath).toBe('data/adapted/stripe.json');
  });

  it('surfaces rate_limited', async () => {
    mockComments([{ body: JSON.stringify({ status: 'rate_limited' }) }]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => expect(result.current.status).toBe('rate_limited'));
  });

  it('ignores non-JSON comments', async () => {
    mockComments([{ body: 'hello there' }]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.step).toBe('waiting');
    expect(result.current.status).toBe('idle');
  });

  it('stops polling after completion', async () => {
    mockComments([
      { body: JSON.stringify({ status: 'complete', adapted_path: 'x', company_slug: 'x' }) },
    ]);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    const callsAfterFirst = fetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    // Allow at most one in-flight poll (the one that detected completion).
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(callsAfterFirst);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptationProgress
```
Expected: FAIL — cannot resolve `../hooks/useAdaptationProgress`.

- [ ] **Step 3: Implement `useAdaptationProgress.ts`**

Create `/home/dev/projects/agentfolio/web/src/hooks/useAdaptationProgress.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../utils/githubApi';
import { fetchIssueComments } from '../utils/githubApi';
import type { ProgressComment, ProgressStep } from '../types';

type Status = 'idle' | 'progress' | 'complete' | 'rate_limited' | 'error';

interface State {
  step: ProgressStep | 'waiting';
  status: Status;
  adaptedPath?: string;
  companySlug?: string;
  errorMessage?: string;
}

const POLL_INTERVAL_MS = 5000;

export function useAdaptationProgress(
  issueNumber: number | null,
  config: ApiConfig,
) {
  const [state, setState] = useState<State>({ step: 'waiting', status: 'idle' });
  const terminal = useRef(false);

  useEffect(() => {
    if (issueNumber === null) return;
    terminal.current = false;
    setState({ step: 'waiting', status: 'idle' });

    let cancelled = false;

    async function poll() {
      if (cancelled || terminal.current) return;
      try {
        const comments = await fetchIssueComments(issueNumber!, config);
        if (cancelled) return;

        let latestProgress: ProgressStep | null = null;
        let terminalEvent: ProgressComment | null = null;

        for (const c of comments) {
          let parsed: ProgressComment | null = null;
          try {
            parsed = JSON.parse(c.body) as ProgressComment;
          } catch {
            continue;
          }
          if (parsed.status === 'progress') {
            latestProgress = parsed.step;
          } else {
            terminalEvent = parsed;
          }
        }

        if (terminalEvent) {
          terminal.current = true;
          if (terminalEvent.status === 'complete') {
            setState({
              step: 'committed',
              status: 'complete',
              adaptedPath: terminalEvent.adapted_path,
              companySlug: terminalEvent.company_slug,
            });
          } else if (terminalEvent.status === 'rate_limited') {
            setState((s) => ({ ...s, status: 'rate_limited' }));
          } else if (terminalEvent.status === 'error') {
            const msg = terminalEvent.message;
            setState((s) => ({ ...s, status: 'error', errorMessage: msg }));
          }
          return;
        }

        if (latestProgress) {
          setState({ step: latestProgress, status: 'progress' });
        }
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({ ...s, status: 'error', errorMessage: (e as Error).message }));
        terminal.current = true;
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [issueNumber, config]);

  return state;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptationProgress
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/hooks/useAdaptationProgress.ts web/src/__tests__/useAdaptationProgress.test.ts
git commit -m "feat(web): add useAdaptationProgress hook with polling"
```

---

## Task 7: Update `useAdaptation` with `needsLiveGeneration` flag

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/hooks/useAdaptation.ts`
- Modify: `/home/dev/projects/agentfolio/web/src/__tests__/useAdaptation.test.ts`

- [ ] **Step 1: Add failing tests to existing file**

Read `/home/dev/projects/agentfolio/web/src/__tests__/useAdaptation.test.ts`. Append these two tests inside the `describe('useAdaptation', ...)` block, right before the closing `});`:

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

- [ ] **Step 2: Run tests to verify the two new ones fail**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptation
```
Expected: 4 existing PASS + 2 new FAIL (because `needsLiveGeneration` isn't returned yet).

- [ ] **Step 3: Modify `useAdaptation.ts` to return `needsLiveGeneration`**

Read `/home/dev/projects/agentfolio/web/src/hooks/useAdaptation.ts`. Replace the entire file with:

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
  const [needsLiveGeneration, setNeedsLiveGeneration] = useState(false);

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
        let fellBack = false;
        if (!adaptedRes.ok) {
          fellBack = true;
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

  return { adapted, base, error, needsLiveGeneration };
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useAdaptation
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/hooks/useAdaptation.ts web/src/__tests__/useAdaptation.test.ts
git commit -m "feat(web): surface needsLiveGeneration flag from useAdaptation"
```

---

## Task 8: `SelfIdPrompt` component with tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/components/SelfIdPrompt.tsx`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/SelfIdPrompt.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/SelfIdPrompt.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelfIdPrompt } from '../components/SelfIdPrompt';

describe('SelfIdPrompt', () => {
  it('renders company and role fields and a submit button', () => {
    render(<SelfIdPrompt onSubmit={() => {}} />);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show me/i })).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed values when both fields are filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SelfIdPrompt onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), '  Stripe  ');
    await user.type(screen.getByLabelText(/role/i), ' FDE ');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    expect(onSubmit).toHaveBeenCalledWith({ company: 'Stripe', role: 'FDE' });
  });

  it('does not call onSubmit when either field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SelfIdPrompt onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), 'Stripe');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- SelfIdPrompt
```
Expected: FAIL — cannot resolve `../components/SelfIdPrompt`.

- [ ] **Step 3: Implement component**

Create `/home/dev/projects/agentfolio/web/src/components/SelfIdPrompt.tsx`:

```typescript
import { useState } from 'react';

interface Props {
  onSubmit: (payload: { company: string; role: string }) => void;
}

export function SelfIdPrompt({ onSubmit }: Props) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = company.trim();
    const r = role.trim();
    if (!c || !r) return;
    onSubmit({ company: c, role: r });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Self-identification">
      <p>Who's reading?</p>
      <label>
        Company
        <input
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      <label>
        Role
        <input
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </label>
      <button type="submit">Show me →</button>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- SelfIdPrompt
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/SelfIdPrompt.tsx web/src/__tests__/SelfIdPrompt.test.tsx
git commit -m "feat(web): add SelfIdPrompt component"
```

---

## Task 9: `AdaptationProgress` component with tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/components/AdaptationProgress.tsx`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/AdaptationProgress.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/AdaptationProgress.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptationProgress } from '../components/AdaptationProgress';

describe('AdaptationProgress', () => {
  it('shows all four pipeline steps', () => {
    render(<AdaptationProgress step="waiting" status="idle" />);
    expect(screen.getByText(/parsing request/i)).toBeInTheDocument();
    expect(screen.getByText(/building profile/i)).toBeInTheDocument();
    expect(screen.getByText(/adapting resume/i)).toBeInTheDocument();
    expect(screen.getByText(/committing/i)).toBeInTheDocument();
  });

  it('marks steps up to and including current step as done', () => {
    render(<AdaptationProgress step="profile_built" status="progress" />);
    const jd = screen.getByText(/parsing request/i).closest('li');
    const profile = screen.getByText(/building profile/i).closest('li');
    const adapted = screen.getByText(/adapting resume/i).closest('li');
    expect(jd?.getAttribute('data-state')).toBe('done');
    expect(profile?.getAttribute('data-state')).toBe('done');
    expect(adapted?.getAttribute('data-state')).toBe('pending');
  });

  it('shows rate-limited message when status is rate_limited', () => {
    render(<AdaptationProgress step="waiting" status="rate_limited" />);
    expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
  });

  it('shows error message when status is error', () => {
    render(<AdaptationProgress step="waiting" status="error" errorMessage="boom" />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- AdaptationProgress
```
Expected: FAIL — cannot resolve `../components/AdaptationProgress`.

- [ ] **Step 3: Implement component**

Create `/home/dev/projects/agentfolio/web/src/components/AdaptationProgress.tsx`:

```typescript
import type { ProgressStep } from '../types';

interface Props {
  step: ProgressStep | 'waiting';
  status: 'idle' | 'progress' | 'complete' | 'rate_limited' | 'error';
  errorMessage?: string;
}

const STEPS: Array<{ key: ProgressStep; label: string }> = [
  { key: 'jd_parsed', label: 'Parsing request' },
  { key: 'profile_built', label: 'Building profile' },
  { key: 'adapted', label: 'Adapting resume' },
  { key: 'committed', label: 'Committing' },
];

function stateFor(current: ProgressStep | 'waiting', key: ProgressStep): 'done' | 'pending' {
  if (current === 'waiting') return 'pending';
  const order: ProgressStep[] = ['jd_parsed', 'profile_built', 'adapted', 'committed'];
  return order.indexOf(current) >= order.indexOf(key) ? 'done' : 'pending';
}

export function AdaptationProgress({ step, status, errorMessage }: Props) {
  return (
    <section aria-label="Generation progress">
      <h3>Generating your adapted resume…</h3>
      <ul>
        {STEPS.map((s) => (
          <li key={s.key} data-state={stateFor(step, s.key)}>
            {s.label}
          </li>
        ))}
      </ul>
      {status === 'rate_limited' && (
        <p role="alert">Rate limit reached. Try again later.</p>
      )}
      {status === 'error' && (
        <p role="alert">Error: {errorMessage ?? 'unknown'}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- AdaptationProgress
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/AdaptationProgress.tsx web/src/__tests__/AdaptationProgress.test.tsx
git commit -m "feat(web): add AdaptationProgress overlay component"
```

---

## Task 10: Wire `App.tsx` for self-ID + live generation

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/App.tsx`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write failing integration test**

Create `/home/dev/projects/agentfolio/web/src/__tests__/App.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { AdaptedResume, BaseResume, SlugRegistry } from '../types';

const baseResume: BaseResume = {
  name: 'Lianghui Yi',
  contact: {
    location: 'Santa Clara, CA',
    phone: '',
    email: 'verky.yi@gmail.com',
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

const defaultAdapted: AdaptedResume = {
  company: 'default',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Default summary',
  section_order: ['summary'],
  experience_order: [],
  bullet_overrides: {},
  project_order: [],
  skill_emphasis: [],
  match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
};

const stripeAdapted: AdaptedResume = { ...defaultAdapted, company: 'Stripe', summary: 'Stripe summary' };

const slugRegistry: SlugRegistry = {};

beforeEach(() => {
  vi.stubEnv('VITE_GITHUB_PAT', 'test-pat');
  vi.stubEnv('VITE_GITHUB_REPO', 'a/b');

  let commentsBySequence: Array<Array<{ body: string }>> = [[]];
  let callIndex = 0;

  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('data/slugs.json')) {
      return { ok: true, json: async () => slugRegistry };
    }
    if (url.endsWith('data/resume.json')) {
      return { ok: true, json: async () => baseResume };
    }
    if (url.includes('data/adapted/stripe.json')) {
      // Before completion: 404. After completion: return stripeAdapted.
      if (callIndex >= 2) return { ok: true, json: async () => stripeAdapted };
      return { ok: false, status: 404 };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    // GitHub API
    if (url.includes('/issues?labels=adapt-request')) {
      return { ok: true, json: async () => [] };
    }
    if (url.endsWith('/issues') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ number: 7 }) };
    }
    if (url.includes('/issues/7/comments')) {
      callIndex += 1;
      if (callIndex >= 2) {
        return {
          ok: true,
          json: async () => [
            { body: JSON.stringify({ status: 'complete', adapted_path: 'data/adapted/stripe.json', company_slug: 'stripe' }) },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('App — self-ID + live generation flow', () => {
  it('shows SelfIdPrompt when no URL slug', async () => {
    window.history.pushState({}, '', '/agentfolio/');
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText(/company/i)).toBeInTheDocument());
  });

  it('creates Issue and renders progress, then hot-swaps on complete', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.history.pushState({}, '', '/agentfolio/');

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/company/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/company/i), 'Stripe');
    await user.type(screen.getByLabelText(/role/i), 'FDE');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    // Progress panel should appear; default summary should render underneath
    await waitFor(() =>
      expect(screen.getByText(/generating your adapted resume/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('Default summary')).toBeInTheDocument();

    // Advance through polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    // After complete, Stripe summary should appear
    await waitFor(() => expect(screen.getByText('Stripe summary')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- App.test
```
Expected: FAIL — App.tsx doesn't implement the self-ID + live generation flow yet.

- [ ] **Step 3: Rewrite `App.tsx`**

Read `/home/dev/projects/agentfolio/web/src/App.tsx`. Replace the entire file with:

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { useAdaptationProgress } from './hooks/useAdaptationProgress';
import { AdaptiveResume } from './components/AdaptiveResume';
import { SelfIdPrompt } from './components/SelfIdPrompt';
import { AdaptationProgress } from './components/AdaptationProgress';
import {
  createAdaptRequest,
  findOpenRequestForCompany,
  getApiConfig,
} from './utils/githubApi';
import type { AdaptedResume, VisitorContext } from './types';

interface SelfId {
  company: string;
  role: string;
}

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export default function App() {
  const { context: urlContext, error: ctxError } = useVisitorContext();
  const [selfId, setSelfId] = useState<SelfId | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

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

  const effectiveContext: VisitorContext | null = selfId
    ? { source: 'self-id', company: normalize(selfId.company), role: selfId.role }
    : urlContext;

  const needsSelfIdForm =
    urlContext !== null && urlContext.source === 'default' && selfId === null;

  const { adapted, base, error: adaptError, needsLiveGeneration } = useAdaptation(
    needsSelfIdForm ? null : effectiveContext?.company ?? null,
  );

  useEffect(() => {
    if (!needsLiveGeneration || !selfId || issueNumber !== null || !apiConfig) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await findOpenRequestForCompany(selfId.company, apiConfig);
        if (cancelled) return;
        if (existing !== null) {
          setIssueNumber(existing);
          return;
        }
        const n = await createAdaptRequest(selfId.company, selfId.role, apiConfig);
        if (cancelled) return;
        setIssueNumber(n);
      } catch (e) {
        if (cancelled) return;
        setRequestError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsLiveGeneration, selfId, issueNumber, apiConfig]);

  const progress = useAdaptationProgress(
    issueNumber,
    apiConfig ?? { pat: '', repo: '' },
  );

  const [liveAdapted, setLiveAdapted] = useState<AdaptedResume | null>(null);
  useEffect(() => {
    if (progress.status !== 'complete' || !progress.adaptedPath) return;
    let cancelled = false;
    (async () => {
      const url = `${import.meta.env.BASE_URL}${progress.adaptedPath}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as AdaptedResume;
      if (cancelled) return;
      setLiveAdapted(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [progress.status, progress.adaptedPath]);

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (needsSelfIdForm) {
    return (
      <main>
        <SelfIdPrompt onSubmit={setSelfId} />
      </main>
    );
  }

  if (!effectiveContext || !adapted || !base) return <main>Loading…</main>;

  const shownAdapted = liveAdapted ?? adapted;

  return (
    <>
      {needsLiveGeneration && issueNumber !== null && progress.status !== 'complete' && (
        <AdaptationProgress
          step={progress.step}
          status={progress.status}
          errorMessage={progress.errorMessage}
        />
      )}
      {requestError && <p role="alert">Request error: {requestError}</p>}
      <AdaptiveResume base={base} adapted={shownAdapted} context={effectiveContext} />
    </>
  );
}
```

- [ ] **Step 4: Run App test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- App.test
```
Expected: PASS (2 tests).

- [ ] **Step 5: Run full web suite**

```bash
cd /home/dev/projects/agentfolio/web
npm test
```
Expected: all PASS (20 from Phase 1 + new Phase 2 tests: 8 + 6 + 2 + 3 + 4 + 2 = 25 new → 45 web tests total).

- [ ] **Step 6: Verify build**

```bash
cd /home/dev/projects/agentfolio/web
npm run build
```
Expected: build succeeds. `VITE_GITHUB_PAT` will be empty in local dev — that's fine; `getApiConfig` will throw and `apiConfig` will be `null`, which disables live generation but doesn't crash.

- [ ] **Step 7: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/App.tsx web/src/__tests__/App.test.tsx
git commit -m "feat(web): wire App for self-ID and live generation"
```

---

## Task 11: Deployment docs and PAT setup

**Files:**
- Modify: `/home/dev/projects/agentfolio/README.md`

- [ ] **Step 1: Read current README**

Read `/home/dev/projects/agentfolio/README.md`.

- [ ] **Step 2: Append a "Live adaptation setup" section**

Use Edit to append after the `## Architecture` section:

Replace:

```markdown
## Architecture

See `docs/architecture.md` for the full design. Implementation plans live in `docs/superpowers/plans/`.
```

With:

```markdown
## Architecture

See `docs/architecture.md` for the full design. Implementation plans live in `docs/superpowers/plans/`.

## Live adaptation setup (Phase 2)

The site can generate adaptations on demand when a visitor self-identifies with a company that has no pre-built file. This requires a fine-grained GitHub PAT.

### Create the PAT

1. Go to https://github.com/settings/personal-access-tokens/new
2. **Repository access:** select *Only select repositories* → `verkyyi/agentfolio`
3. **Repository permissions:** set `Issues` to `Read and write`. Leave everything else as `No access`.
4. **Expiration:** 90 days (renew quarterly)
5. Generate and copy the token.

### Configure the secret

```bash
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# paste the PAT when prompted
```

The `deploy.yml` workflow reads this secret and bakes it into the client bundle as `VITE_GITHUB_PAT`.

### Local development

Copy `web/.env.example` to `web/.env.local` and paste the PAT. `.env.local` is gitignored. If you skip this, the dev site still works but live generation is disabled (unknown-company visitors see the default adaptation without triggering an Issue).

### Rotation

When the PAT expires or is compromised:

```bash
# Revoke old token in GitHub UI, generate new one with same scopes, then:
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# Re-run deploy workflow:
gh workflow run deploy.yml --repo verkyyi/agentfolio
```
```

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add README.md
git commit -m "docs: add PAT setup instructions for live adaptation"
```

---

## Task 12: Deploy, end-to-end smoke test

**Files:** (no code changes — deployment and manual verification)

- [ ] **Step 1: User creates the PAT**

Follow the README instructions in Task 11. This must be done by the user — it requires GitHub UI access.

- [ ] **Step 2: User sets the secret**

```bash
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# paste PAT
```

- [ ] **Step 3: Push all Phase 2 commits to main**

```bash
cd /home/dev/projects/agentfolio
git checkout main
git merge <phase2-feature-branch> --ff-only
git push origin main
```

- [ ] **Step 4: Watch deploy workflow**

```bash
gh run watch --repo verkyyi/agentfolio --exit-status
```
Expected: deploy succeeds.

- [ ] **Step 5: Smoke-test live generation**

1. Visit https://verkyyi.github.io/agentfolio/ in an incognito browser window.
2. Verify `SelfIdPrompt` appears.
3. Type a real unknown company, e.g. `Databricks`, role `FDE`, submit.
4. Verify `AdaptationProgress` overlay appears immediately.
5. Within 60-90s, the overlay should disappear and the adapted resume for Databricks should render.
6. Verify: https://github.com/verkyyi/agentfolio/issues — the issue was created, has progress comments, and is closed with `adapt-complete` label.
7. Verify: https://verkyyi.github.io/agentfolio/data/adapted/databricks.json now returns 200 (cached for next visitor).

- [ ] **Step 6: Verify rate limiter**

Open 11+ adaptation requests in quick succession (use a script or just submit the form 11 times with different company names). The 11th+ request should receive a `rate_limited` comment and be closed with the `rate-limited` label. The frontend should show "Rate limit reached. Try again later."

Clean up afterward by closing the test issues:
```bash
gh issue list --repo verkyyi/agentfolio --label adapt-request --limit 50 --json number --jq '.[].number' | xargs -I{} gh issue close {} --repo verkyyi/agentfolio
```

- [ ] **Step 7: Document the smoke-test outcome**

In `docs/superpowers/plans/2026-04-15-phase2-live-adaptation-generation.md`, add a `## Smoke Test Results` section at the bottom noting the date, companies tested, live generation latency observed, and any issues discovered. Commit this as `docs: record Phase 2 smoke test results`.

---

## Acceptance Criteria

Phase 2 is complete when:

1. `python -m pytest scripts/tests/` passes (19 tests: 15 Phase 1 + 4 new).
2. `cd web && npm test` passes (45 tests: 20 Phase 1 + 25 new).
3. `cd web && npm run build` produces a bundle that includes the baked-in `VITE_GITHUB_PAT`.
4. Navigating to https://verkyyi.github.io/agentfolio/ (no slug) shows `SelfIdPrompt`.
5. Submitting `(Databricks, FDE)` creates an Issue, triggers the workflow, shows progress overlay, and hot-swaps to an adapted resume within 90 seconds.
6. Subsequent visits to `(Databricks, FDE)` load the cached adaptation instantly (no Issue created).
7. Rate limiter closes the 11th request in an hour with a `rate_limited` status comment.
8. If `VITE_GITHUB_PAT` is unset, the site degrades gracefully: unknown companies see the default adaptation, no Issue is created, no crash.

---

## Follow-up Phases (out of scope for this plan)

- **Phase 3:** `useBehaviorTracker` hook, `aggregate_feedback.py`, `analytics.yml` weekly cron, `data/analytics.json` output.
- **Phase 4:** Chat widget with RAG over `resume.json`, domain-restricted LLM API key, client-side rate limit.
- **Phase 5:** `/how-it-works` architecture page, JD auto-fetch via `fetch_jds.py` + `jd-sync.yml`, LLM-powered summary rewriting in `adapt_one.py`, match-score refinement (score across bullets + skills, weight keywords).
