# AgentFolio Phase 3: Analytics Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture anonymous visitor behavior events in the browser, flush them to GitHub Issues labeled `analytics`, and aggregate them into `data/analytics.json` weekly — so the owner can review engagement patterns and iterate on resume/profile content.

**Architecture:** The browser tracks events in an in-memory buffer (no cookies, no PII). Events include session metadata, scroll depth, section dwell (via `IntersectionObserver`), project-link clicks, and contact-CTA clicks. The first flush (at +60s session time or on `visibilitychange → hidden`) creates a GitHub Issue via the existing `VITE_GITHUB_PAT`; subsequent flushes post comments on that same issue, keeping one issue per session. A weekly `analytics.yml` workflow runs `scripts/aggregate_feedback.py`, which lists all open `analytics`-labeled issues, parses their bodies and comments, aggregates per-company metrics, writes `data/analytics.json`, and closes the processed issues. The aggregated file is static and committed — Phase 5's architecture page will read it. Phase 3 adds no visible UI changes.

**Tech Stack:** React 18 + TypeScript + Vitest · `IntersectionObserver` (with polyfill in tests) · Python 3.11 stdlib (`urllib.request`) · GitHub REST API · GitHub Actions.

**Out of scope:** UI for analytics (the architecture page is Phase 5). Skill hover tracking (noisy, low signal — revisit if Phase 5 reveals a need). Chat question tracking (Phase 4).

**Privacy contract:**
- No cookies, no `localStorage` for tracking (only `sessionStorage` for the current-session issue number, cleared on tab close).
- No IP logging (the GitHub API logs caller IPs, but aggregation discards them).
- No user-agent fingerprinting.
- Events carry only: event type, event data, timestamp, session context (`company`, `source`, `adaptation` slug — all non-PII).
- Every commit of `data/analytics.json` is publicly auditable — visitors can verify exactly what is aggregated.

---

## File Structure

**Files created or modified in Phase 3:**

```
agentfolio/
├── scripts/
│   ├── aggregate_feedback.py              # NEW: weekly aggregator
│   └── tests/
│       └── test_aggregate_feedback.py     # NEW
├── .github/workflows/
│   └── analytics.yml                      # NEW: weekly cron
├── web/
│   ├── src/
│   │   ├── types.ts                       # MODIFY: add AnalyticsEvent, AnalyticsFlushPayload
│   │   ├── utils/
│   │   │   └── trackingApi.ts             # NEW: create/append analytics issues
│   │   ├── hooks/
│   │   │   └── useBehaviorTracker.ts      # NEW: event buffer + flush + scroll listener
│   │   ├── components/
│   │   │   ├── AdaptiveResume.tsx         # MODIFY: add onCtaClick + onProjectClick wiring
│   │   │   ├── ProjectsSection.tsx        # MODIFY: call onProjectClick prop
│   │   │   └── SectionDwellTracker.tsx    # NEW: IntersectionObserver wrapper
│   │   ├── App.tsx                        # MODIFY: instantiate tracker, wire events
│   │   └── __tests__/
│   │       ├── trackingApi.test.ts        # NEW
│   │       ├── useBehaviorTracker.test.ts # NEW
│   │       ├── SectionDwellTracker.test.tsx # NEW
│   │       └── AdaptiveResume.test.tsx    # MODIFY: cover new click props
└── README.md                              # MODIFY: privacy note
```

**Responsibility boundaries:**

- `scripts/aggregate_feedback.py` — pure function `aggregate(sessions: list[dict]) → dict` + thin HTTP shell that lists/closes issues. Reusable from tests without network.
- `.github/workflows/analytics.yml` — schedule + commit step only.
- `web/src/utils/trackingApi.ts` — two functions: `createAnalyticsIssue(payload, cfg)`, `appendAnalyticsComment(issueNumber, payload, cfg)`. No React, no state.
- `web/src/hooks/useBehaviorTracker.ts` — owns the event buffer, flush scheduler (60s interval + visibilitychange), scroll listener, and `track()` callback. Exposes `{ track }` to consumers.
- `web/src/components/SectionDwellTracker.tsx` — thin wrapper that observes a section element and calls `track('section_dwell', ...)` when it leaves the viewport with the dwell duration.
- `AdaptiveResume`, `ProjectsSection` — accept optional click-callback props; call them on matching clicks. They do not know about the tracker.
- `App.tsx` — instantiates `useBehaviorTracker` and passes `track` down as callback props.

---

## Event Schema

```typescript
type AnalyticsEvent =
  | { type: 'session_start'; data: { company: string; source: string; adaptation: string; match_score: number }; ts: number }
  | { type: 'session_heartbeat'; data: { duration_ms: number; max_scroll_pct: number }; ts: number }
  | { type: 'section_dwell'; data: { section: string; ms: number }; ts: number }
  | { type: 'project_click'; data: { project_id: string; link: 'url' | 'github' }; ts: number }
  | { type: 'cta_click'; data: { target: 'email' | 'linkedin' | 'github' }; ts: number };

interface AnalyticsFlushPayload {
  session_id: string;       // client-generated UUIDv4, stable per tab
  events: AnalyticsEvent[];
}
```

**Issue body (first flush):** `JSON.stringify(payload, null, 2)`, inside a markdown code block for easier manual inspection.
**Comment body (subsequent flushes):** same format.
**Issue title:** `[analytics] <ISO timestamp>`
**Labels:** `['analytics']`

---

## Aggregator Output (`data/analytics.json`)

```json
{
  "generated_at": "2026-04-20T06:00:00Z",
  "source_issues": 47,
  "total_sessions": 47,
  "unique_companies": 4,
  "by_company": {
    "cohere": {
      "sessions": 12,
      "avg_duration_s": 87.3,
      "avg_max_scroll_pct": 0.72,
      "section_dwell_avg_s": { "summary": 5.2, "projects": 18.4, "experience": 12.1 },
      "project_clicks": { "agentfolio": 8, "ainbox": 3 },
      "cta_clicks": { "email": 4, "linkedin": 2, "github": 1 }
    }
  },
  "global": {
    "avg_duration_s": 62.1,
    "top_projects": [["agentfolio", 12], ["ainbox", 7]],
    "top_sections": [["projects", 17.9], ["experience", 11.2]]
  }
}
```

---

## Task 1: Python aggregator — pure function + tests

**Files:**
- Create: `/home/dev/projects/agentfolio/scripts/aggregate_feedback.py`
- Create: `/home/dev/projects/agentfolio/scripts/tests/test_aggregate_feedback.py`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/scripts/tests/test_aggregate_feedback.py`:

```python
from scripts.aggregate_feedback import aggregate


def make_session(company, duration_s=60, scroll=0.5, sections=None, projects=None, ctas=None):
    events = []
    events.append({
        "type": "session_start",
        "data": {"company": company, "source": "slug", "adaptation": company, "match_score": 0.5},
        "ts": 1,
    })
    events.append({
        "type": "session_heartbeat",
        "data": {"duration_ms": duration_s * 1000, "max_scroll_pct": scroll},
        "ts": duration_s * 1000,
    })
    for section, ms in (sections or {}).items():
        events.append({"type": "section_dwell", "data": {"section": section, "ms": ms}, "ts": 100})
    for pid in projects or []:
        events.append({"type": "project_click", "data": {"project_id": pid, "link": "url"}, "ts": 200})
    for target in ctas or []:
        events.append({"type": "cta_click", "data": {"target": target}, "ts": 300})
    return {"session_id": f"s-{company}", "events": events}


def test_aggregate_counts_sessions_per_company():
    sessions = [
        make_session("cohere"),
        make_session("cohere"),
        make_session("stripe"),
    ]
    result = aggregate(sessions)
    assert result["total_sessions"] == 3
    assert result["unique_companies"] == 2
    assert result["by_company"]["cohere"]["sessions"] == 2
    assert result["by_company"]["stripe"]["sessions"] == 1


def test_aggregate_averages_duration_and_scroll():
    sessions = [
        make_session("cohere", duration_s=60, scroll=0.5),
        make_session("cohere", duration_s=100, scroll=0.9),
    ]
    result = aggregate(sessions)
    c = result["by_company"]["cohere"]
    assert c["avg_duration_s"] == 80.0
    assert c["avg_max_scroll_pct"] == 0.7


def test_aggregate_section_dwell_averages_only_across_sessions_that_recorded_it():
    sessions = [
        make_session("cohere", sections={"projects": 10000}),
        make_session("cohere", sections={"projects": 30000, "experience": 5000}),
    ]
    result = aggregate(sessions)
    s = result["by_company"]["cohere"]["section_dwell_avg_s"]
    assert s["projects"] == 20.0
    assert s["experience"] == 5.0


def test_aggregate_sums_project_and_cta_clicks():
    sessions = [
        make_session("cohere", projects=["agentfolio", "agentfolio", "ainbox"], ctas=["email", "linkedin"]),
        make_session("cohere", projects=["agentfolio"], ctas=["email"]),
    ]
    result = aggregate(sessions)
    c = result["by_company"]["cohere"]
    assert c["project_clicks"] == {"agentfolio": 3, "ainbox": 1}
    assert c["cta_clicks"] == {"email": 2, "linkedin": 1}


def test_aggregate_global_top_projects_sorted_desc():
    sessions = [
        make_session("cohere", projects=["a", "a", "b"]),
        make_session("stripe", projects=["a", "c", "c", "c"]),
    ]
    result = aggregate(sessions)
    top = result["global"]["top_projects"]
    assert top[0] == ["c", 3]
    assert top[1] == ["a", 3] or top[1][1] == 3
    # c and a both have 3; either can be first
    assert sum(v for _, v in top) == 7


def test_aggregate_global_duration_is_mean_across_all_sessions():
    sessions = [
        make_session("cohere", duration_s=60),
        make_session("stripe", duration_s=120),
    ]
    result = aggregate(sessions)
    assert result["global"]["avg_duration_s"] == 90.0


def test_aggregate_ignores_sessions_without_session_start():
    sessions = [
        {"session_id": "orphan", "events": [
            {"type": "cta_click", "data": {"target": "email"}, "ts": 1}
        ]},
        make_session("cohere"),
    ]
    result = aggregate(sessions)
    assert result["total_sessions"] == 1


def test_aggregate_empty_input():
    result = aggregate([])
    assert result["total_sessions"] == 0
    assert result["unique_companies"] == 0
    assert result["by_company"] == {}
```

- [ ] **Step 2: Run failing tests**

```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/test_aggregate_feedback.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.aggregate_feedback'`.

- [ ] **Step 3: Implement pure `aggregate()`**

Create `/home/dev/projects/agentfolio/scripts/aggregate_feedback.py`:

```python
"""Aggregate visitor analytics from GitHub Issues into data/analytics.json.

Pure function `aggregate()` for testing; thin HTTP shell `run()` for the workflow.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _extract_context(events: list[dict]) -> dict | None:
    for e in events:
        if e.get("type") == "session_start":
            return e.get("data", {})
    return None


def _mean(xs: list[float]) -> float:
    return round(sum(xs) / len(xs), 2) if xs else 0.0


def aggregate(sessions: list[dict]) -> dict:
    by_company: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "sessions": 0,
        "durations_s": [],
        "scrolls": [],
        "section_dwell_ms": defaultdict(list),
        "project_clicks": defaultdict(int),
        "cta_clicks": defaultdict(int),
    })
    global_project_clicks: dict[str, int] = defaultdict(int)
    global_section_ms: dict[str, list[float]] = defaultdict(list)
    global_durations_s: list[float] = []
    total = 0

    for session in sessions:
        events = session.get("events", [])
        ctx = _extract_context(events)
        if not ctx:
            continue
        company = ctx.get("company", "unknown")
        total += 1
        c = by_company[company]
        c["sessions"] += 1

        for e in events:
            t = e.get("type")
            d = e.get("data", {})
            if t == "session_heartbeat":
                c["durations_s"].append(d.get("duration_ms", 0) / 1000.0)
                global_durations_s.append(d.get("duration_ms", 0) / 1000.0)
                c["scrolls"].append(d.get("max_scroll_pct", 0))
            elif t == "section_dwell":
                section = d.get("section", "")
                ms = d.get("ms", 0)
                c["section_dwell_ms"][section].append(ms)
                global_section_ms[section].append(ms)
            elif t == "project_click":
                pid = d.get("project_id", "")
                c["project_clicks"][pid] += 1
                global_project_clicks[pid] += 1
            elif t == "cta_click":
                target = d.get("target", "")
                c["cta_clicks"][target] += 1

    by_company_out: dict[str, dict] = {}
    for company, c in by_company.items():
        by_company_out[company] = {
            "sessions": c["sessions"],
            "avg_duration_s": _mean(c["durations_s"]),
            "avg_max_scroll_pct": _mean(c["scrolls"]),
            "section_dwell_avg_s": {
                k: round(sum(v) / 1000.0 / len(v), 2) for k, v in c["section_dwell_ms"].items()
            },
            "project_clicks": dict(c["project_clicks"]),
            "cta_clicks": dict(c["cta_clicks"]),
        }

    top_projects = sorted(global_project_clicks.items(), key=lambda kv: -kv[1])
    top_sections = sorted(
        ((k, round(sum(v) / 1000.0 / len(v), 2)) for k, v in global_section_ms.items()),
        key=lambda kv: -kv[1],
    )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_issues": total,
        "total_sessions": total,
        "unique_companies": len(by_company_out),
        "by_company": by_company_out,
        "global": {
            "avg_duration_s": _mean(global_durations_s),
            "top_projects": [[k, v] for k, v in top_projects],
            "top_sections": [[k, v] for k, v in top_sections],
        },
    }


def _api(method: str, path: str, token: str, body: dict | None = None) -> Any:
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "agentfolio-aggregate-feedback",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        text = resp.read().decode("utf-8")
        return json.loads(text) if text else None


def _parse_payload(body: str) -> dict | None:
    # Accept either raw JSON or JSON inside a markdown code block.
    body = body.strip()
    if body.startswith("```"):
        body = body.strip("`")
        # drop the leading language tag if any
        if body.startswith("json"):
            body = body[4:]
        body = body.strip()
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def _collect_sessions(repo: str, token: str) -> tuple[list[dict], list[int]]:
    sessions: list[dict] = []
    processed: list[int] = []
    page = 1
    while True:
        issues = _api(
            "GET",
            f"/repos/{repo}/issues?labels=analytics&state=open&per_page=100&page={page}",
            token,
        )
        if not issues:
            break
        for issue in issues:
            number = issue["number"]
            events: list[dict] = []
            body = _parse_payload(issue.get("body") or "")
            if body and "events" in body:
                events.extend(body["events"])
                session_id = body.get("session_id", f"issue-{number}")
            else:
                session_id = f"issue-{number}"

            comments = _api(
                "GET", f"/repos/{repo}/issues/{number}/comments?per_page=100", token
            ) or []
            for c in comments:
                cbody = _parse_payload(c.get("body") or "")
                if cbody and "events" in cbody:
                    events.extend(cbody["events"])

            sessions.append({"session_id": session_id, "events": events})
            processed.append(number)
        page += 1
    return sessions, processed


def _close_issues(numbers: list[int], repo: str, token: str) -> None:
    for n in numbers:
        _api("PATCH", f"/repos/{repo}/issues/{n}", token, {"state": "closed", "labels": ["analytics-processed"]})


def run(output_path: Path, repo: str, token: str) -> dict:
    sessions, processed = _collect_sessions(repo, token)
    result = aggregate(sessions)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2) + "\n")
    _close_issues(processed, repo, token)
    return result


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Aggregate analytics issues.")
    parser.add_argument("--output", default="data/analytics.json")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""))
    args = parser.parse_args(argv)

    if not args.repo or not args.token:
        print("repo and token required (set GITHUB_REPOSITORY and GITHUB_TOKEN)", file=sys.stderr)
        return 2

    result = run(Path(args.output), args.repo, args.token)
    print(f"wrote {args.output} — {result['total_sessions']} sessions across {result['unique_companies']} companies")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio
python3 -m pytest scripts/tests/test_aggregate_feedback.py -v
```
Expected: PASS (8 tests).

- [ ] **Step 5: Run full pytest suite**

```bash
python3 -m pytest scripts/tests/ -v
```
Expected: 19 from prior phases + 8 new = 27 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/aggregate_feedback.py scripts/tests/test_aggregate_feedback.py
git commit -m "feat(analytics): add aggregate_feedback aggregator with tests"
```

---

## Task 2: `analytics.yml` weekly workflow

**Files:**
- Create: `/home/dev/projects/agentfolio/.github/workflows/analytics.yml`

- [ ] **Step 1: Create the workflow**

Create `/home/dev/projects/agentfolio/.github/workflows/analytics.yml`:

```yaml
name: Aggregate Analytics
on:
  schedule:
    - cron: '0 6 * * 0'  # Sundays 06:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - run: pip install -r scripts/requirements.txt

      - name: Aggregate
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: python -m scripts.aggregate_feedback --output data/analytics.json

      - name: Commit analytics.json
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/analytics.json
          if git diff --cached --quiet; then
            echo "no analytics changes"
          else
            git commit -m "chore(analytics): weekly aggregation"
            git push
          fi
```

- [ ] **Step 2: Validate YAML**

```bash
cd /home/dev/projects/agentfolio
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/analytics.yml')); print('valid yaml')"
```
Expected: `valid yaml`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/analytics.yml
git commit -m "ci: add weekly analytics aggregation workflow"
```

---

## Task 3: Extend web types

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/types.ts`

- [ ] **Step 1: Append new types**

Read `/home/dev/projects/agentfolio/web/src/types.ts`. Use the Edit tool to append (at end of file) after the existing `GithubIssue` interface:

```typescript

export type AnalyticsEvent =
  | {
      type: 'session_start';
      data: { company: string; source: string; adaptation: string; match_score: number };
      ts: number;
    }
  | {
      type: 'session_heartbeat';
      data: { duration_ms: number; max_scroll_pct: number };
      ts: number;
    }
  | {
      type: 'section_dwell';
      data: { section: string; ms: number };
      ts: number;
    }
  | {
      type: 'project_click';
      data: { project_id: string; link: 'url' | 'github' };
      ts: number;
    }
  | {
      type: 'cta_click';
      data: { target: 'email' | 'linkedin' | 'github' };
      ts: number;
    };

export interface AnalyticsFlushPayload {
  session_id: string;
  events: AnalyticsEvent[];
}
```

- [ ] **Step 2: Verify tsc**

```bash
cd /home/dev/projects/agentfolio/web
npx tsc --noEmit
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/types.ts
git commit -m "feat(web): add AnalyticsEvent and AnalyticsFlushPayload types"
```

---

## Task 4: `trackingApi.ts` utility + tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/utils/trackingApi.ts`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/trackingApi.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/trackingApi.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createAnalyticsIssue, appendAnalyticsComment } from '../utils/trackingApi';
import type { AnalyticsFlushPayload } from '../types';

const payload: AnalyticsFlushPayload = {
  session_id: 'abc123',
  events: [
    { type: 'session_start', data: { company: 'cohere', source: 'slug', adaptation: 'cohere', match_score: 0.8 }, ts: 1 },
  ],
};

describe('createAnalyticsIssue', () => {
  it('POSTs an issue with analytics label and returns issue number', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ number: 99 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const n = await createAnalyticsIssue(payload, { pat: 'tok', repo: 'a/b' });
    expect(n).toBe(99);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.title.startsWith('[analytics]')).toBe(true);
    expect(body.labels).toEqual(['analytics']);
    expect(body.body).toContain('"session_id": "abc123"');
  });
});

describe('appendAnalyticsComment', () => {
  it('POSTs a comment to the existing issue', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ id: 123 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await appendAnalyticsComment(99, payload, { pat: 'tok', repo: 'a/b' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues/99/comments');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.body).toContain('"session_id": "abc123"');
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- trackingApi
```
Expected: FAIL — cannot resolve `../utils/trackingApi`.

- [ ] **Step 3: Implement**

Create `/home/dev/projects/agentfolio/web/src/utils/trackingApi.ts`:

```typescript
import type { ApiConfig } from './githubApi';
import type { AnalyticsFlushPayload } from '../types';

function headers(cfg: ApiConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function toBody(payload: AnalyticsFlushPayload): string {
  return '```json\n' + JSON.stringify(payload, null, 2) + '\n```';
}

export async function createAnalyticsIssue(
  payload: AnalyticsFlushPayload,
  cfg: ApiConfig,
): Promise<number> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues`;
  const body = {
    title: `[analytics] ${new Date().toISOString()}`,
    body: toBody(payload),
    labels: ['analytics'],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create analytics issue failed: ${res.status}`);
  const data = (await res.json()) as { number: number };
  return data.number;
}

export async function appendAnalyticsComment(
  issueNumber: number,
  payload: AnalyticsFlushPayload,
  cfg: ApiConfig,
): Promise<void> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ body: toBody(payload) }),
  });
  if (!res.ok) throw new Error(`append analytics comment failed: ${res.status}`);
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- trackingApi
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/utils/trackingApi.ts web/src/__tests__/trackingApi.test.ts
git commit -m "feat(web): add trackingApi utility for analytics issues"
```

---

## Task 5: `useBehaviorTracker` hook + tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/hooks/useBehaviorTracker.ts`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/useBehaviorTracker.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/useBehaviorTracker.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBehaviorTracker } from '../hooks/useBehaviorTracker';

const cfg = { pat: 'tok', repo: 'a/b' };

const startCtx = { company: 'cohere', source: 'slug', adaptation: 'cohere', match_score: 0.8 };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubFetch() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/issues')) {
      return { ok: true, json: async () => ({ number: 42 }) };
    }
    if (url.includes('/comments')) {
      return { ok: true, json: async () => ({ id: 1 }) };
    }
    return { ok: false, status: 404 };
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

describe('useBehaviorTracker', () => {
  it('emits a session_start event on init', () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true }));
    expect(result.current.eventCount).toBeGreaterThanOrEqual(1);
  });

  it('track() appends events to the buffer', () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: Date.now() });
    });
    expect(result.current.eventCount).toBeGreaterThanOrEqual(2);
  });

  it('creates an analytics issue on first flush', async () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/issues') && c.init?.method === 'POST')).toBe(true));
  });

  it('appends a comment on subsequent flush', async () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));

    // First flush
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/issues'))).toBe(true));

    // Second flush
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'linkedin' }, ts: 2 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.includes('/comments'))).toBe(true));
  });

  it('buffer clears after successful flush', async () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(result.current.eventCount).toBe(0));
  });

  it('does nothing when disabled', () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: false, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    expect(calls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useBehaviorTracker
```
Expected: FAIL — cannot resolve `../hooks/useBehaviorTracker`.

- [ ] **Step 3: Implement**

Create `/home/dev/projects/agentfolio/web/src/hooks/useBehaviorTracker.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../utils/githubApi';
import { appendAnalyticsComment, createAnalyticsIssue } from '../utils/trackingApi';
import type { AnalyticsEvent } from '../types';

interface Options {
  config: ApiConfig;
  startCtx: { company: string; source: string; adaptation: string; match_score: number };
  enabled: boolean;
  flushIntervalMs?: number;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_FLUSH_MS = 60000;

export function useBehaviorTracker(options: Options) {
  const { config, startCtx, enabled, flushIntervalMs = DEFAULT_FLUSH_MS } = options;
  const buffer = useRef<AnalyticsEvent[]>([]);
  const sessionId = useRef<string>(uuid());
  const startedAt = useRef<number>(Date.now());
  const issueNumber = useRef<number | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const maxScroll = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    buffer.current.push({
      type: 'session_start',
      data: startCtx,
      ts: Date.now(),
    });
    setEventCount(buffer.current.length);
  }, [enabled, startCtx]);

  const track = useCallback(
    (event: AnalyticsEvent) => {
      if (!enabled) return;
      buffer.current.push(event);
      setEventCount(buffer.current.length);
    },
    [enabled],
  );

  const flush = useCallback(async () => {
    if (!enabled) return;
    const heartbeat: AnalyticsEvent = {
      type: 'session_heartbeat',
      data: {
        duration_ms: Date.now() - startedAt.current,
        max_scroll_pct: Number(maxScroll.current.toFixed(2)),
      },
      ts: Date.now(),
    };
    const events = [...buffer.current, heartbeat];
    if (events.length === 1 && issueNumber.current !== null) {
      // only heartbeat; skip to avoid spam — still mark buffer cleared
      buffer.current = [];
      setEventCount(0);
      return;
    }
    const payload = { session_id: sessionId.current, events };
    try {
      if (issueNumber.current === null) {
        issueNumber.current = await createAnalyticsIssue(payload, config);
      } else {
        await appendAnalyticsComment(issueNumber.current, payload, config);
      }
      buffer.current = [];
      setEventCount(0);
    } catch {
      // keep buffer; retry on next interval
    }
  }, [config, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      const scrolled =
        (window.scrollY + window.innerHeight) /
        Math.max(document.documentElement.scrollHeight, 1);
      if (scrolled > maxScroll.current) maxScroll.current = Math.min(scrolled, 1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(flush, flushIntervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, flush, flushIntervalMs]);

  return { track, eventCount };
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- useBehaviorTracker
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/hooks/useBehaviorTracker.ts web/src/__tests__/useBehaviorTracker.test.ts
git commit -m "feat(web): add useBehaviorTracker hook with periodic flush"
```

---

## Task 6: `SectionDwellTracker` component + tests

**Files:**
- Create: `/home/dev/projects/agentfolio/web/src/components/SectionDwellTracker.tsx`
- Create: `/home/dev/projects/agentfolio/web/src/__tests__/SectionDwellTracker.test.tsx`

- [ ] **Step 1: Install `IntersectionObserver` polyfill for tests**

JSDOM doesn't provide `IntersectionObserver`. Add a test-only mock in `web/src/test-setup.ts`.

Read `/home/dev/projects/agentfolio/web/src/test-setup.ts`. Append after existing content:

```typescript

// JSDOM lacks IntersectionObserver; provide a minimal mock driven by tests.
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Element[] = [];
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    (globalThis as any).__iobservers = (globalThis as any).__iobservers || [];
    (globalThis as any).__iobservers.push(this);
  }
  observe(el: Element) { this.elements.push(el); }
  unobserve(el: Element) { this.elements = this.elements.filter((e) => e !== el); }
  disconnect() { this.elements = []; }
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
  trigger(intersecting: boolean) {
    this.callback(
      this.elements.map((target) => ({
        target,
        isIntersecting: intersecting,
        intersectionRatio: intersecting ? 1 : 0,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

export function triggerIntersection(intersecting: boolean) {
  const list = ((globalThis as any).__iobservers as MockIntersectionObserver[]) || [];
  for (const o of list) o.trigger(intersecting);
}
```

- [ ] **Step 2: Write failing tests**

Create `/home/dev/projects/agentfolio/web/src/__tests__/SectionDwellTracker.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SectionDwellTracker } from '../components/SectionDwellTracker';
import { triggerIntersection } from '../test-setup';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SectionDwellTracker', () => {
  it('calls onDwell with elapsed ms when section leaves viewport', () => {
    const onDwell = vi.fn();
    render(
      <SectionDwellTracker name="projects" onDwell={onDwell}>
        <div data-testid="inner">content</div>
      </SectionDwellTracker>,
    );

    act(() => {
      triggerIntersection(true);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      triggerIntersection(false);
    });

    expect(onDwell).toHaveBeenCalledTimes(1);
    const [section, ms] = onDwell.mock.calls[0];
    expect(section).toBe('projects');
    expect(ms).toBeGreaterThanOrEqual(2900);
    expect(ms).toBeLessThanOrEqual(3100);
  });

  it('calls onDwell on unmount if still visible', () => {
    const onDwell = vi.fn();
    const { unmount } = render(
      <SectionDwellTracker name="summary" onDwell={onDwell}>
        <div />
      </SectionDwellTracker>,
    );
    act(() => {
      triggerIntersection(true);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    unmount();
    expect(onDwell).toHaveBeenCalled();
    const [section, ms] = onDwell.mock.calls[0];
    expect(section).toBe('summary');
    expect(ms).toBeGreaterThanOrEqual(1900);
  });

  it('does not call onDwell if never intersected', () => {
    const onDwell = vi.fn();
    const { unmount } = render(
      <SectionDwellTracker name="skills" onDwell={onDwell}>
        <div />
      </SectionDwellTracker>,
    );
    unmount();
    expect(onDwell).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run failing test**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- SectionDwellTracker
```
Expected: FAIL — cannot resolve `../components/SectionDwellTracker`.

- [ ] **Step 4: Implement**

Create `/home/dev/projects/agentfolio/web/src/components/SectionDwellTracker.tsx`:

```typescript
import { useEffect, useRef } from 'react';

interface Props {
  name: string;
  onDwell: (section: string, ms: number) => void;
  children: React.ReactNode;
}

export function SectionDwellTracker({ name, onDwell, children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const flushIfVisible = () => {
      if (visibleSince.current !== null) {
        const ms = Date.now() - visibleSince.current;
        visibleSince.current = null;
        if (ms > 0) onDwell(name, ms);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (visibleSince.current === null) visibleSince.current = Date.now();
        } else {
          flushIfVisible();
        }
      }
    });
    observer.observe(el);

    return () => {
      flushIfVisible();
      observer.disconnect();
    };
  }, [name, onDwell]);

  return <div ref={ref}>{children}</div>;
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- SectionDwellTracker
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/SectionDwellTracker.tsx web/src/__tests__/SectionDwellTracker.test.tsx web/src/test-setup.ts
git commit -m "feat(web): add SectionDwellTracker with IntersectionObserver"
```

---

## Task 7: Add click + dwell callbacks to `AdaptiveResume` + `ProjectsSection`

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/components/ProjectsSection.tsx`
- Modify: `/home/dev/projects/agentfolio/web/src/components/AdaptiveResume.tsx`
- Modify: `/home/dev/projects/agentfolio/web/src/__tests__/AdaptiveResume.test.tsx`

`AdaptiveResume` accepts three optional callbacks: `onCtaClick`, `onProjectClick`, `onSectionDwell`. When `onSectionDwell` is provided, each rendered section's wrapper `<div>` is itself wrapped in `SectionDwellTracker` (built in Task 6) so that dwell measurement is delegated to that reusable component — AdaptiveResume doesn't know about IntersectionObserver.

- [ ] **Step 1: Extend `ProjectsSection` with `onProjectClick`**

Read `/home/dev/projects/agentfolio/web/src/components/ProjectsSection.tsx`. Replace the entire file with:

```typescript
import type { Project } from '../types';

interface Props {
  projects: Project[];
  order: string[];
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
}

export function ProjectsSection({ projects, order, onProjectClick }: Props) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Project[];

  return (
    <section aria-label="Projects">
      <h2>Projects</h2>
      {ordered.map((p) => (
        <article key={p.id}>
          <header>
            <h3>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onProjectClick?.(p.id, 'url')}
              >
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

- [ ] **Step 2: Extend `AdaptiveResume` with all three callbacks**

Read `/home/dev/projects/agentfolio/web/src/components/AdaptiveResume.tsx`. Replace the entire file with:

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
import { SectionDwellTracker } from './SectionDwellTracker';

interface Props {
  base: BaseResume;
  adapted: AdaptedResume;
  context: VisitorContext;
  onCtaClick?: (target: 'email' | 'linkedin' | 'github') => void;
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
  onSectionDwell?: (section: SectionName, ms: number) => void;
}

export function AdaptiveResume({
  base,
  adapted,
  context,
  onCtaClick,
  onProjectClick,
  onSectionDwell,
}: Props) {
  const renderers: Record<SectionName, () => React.ReactElement> = {
    summary: () => <SummarySection summary={adapted.summary} />,
    experience: () => (
      <ExperienceSection
        experience={base.experience}
        order={adapted.experience_order}
        bulletOverrides={adapted.bullet_overrides}
      />
    ),
    projects: () => (
      <ProjectsSection
        projects={base.projects}
        order={adapted.project_order}
        onProjectClick={onProjectClick}
      />
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
          {base.contact.location} ·{' '}
          <a
            href={`mailto:${base.contact.email}`}
            onClick={() => onCtaClick?.('email')}
          >
            {base.contact.email}
          </a>{' '}
          ·{' '}
          <a href={base.contact.linkedin} onClick={() => onCtaClick?.('linkedin')}>
            LinkedIn
          </a>{' '}
          ·{' '}
          <a href={base.contact.github} onClick={() => onCtaClick?.('github')}>
            GitHub
          </a>
        </p>
        <DebugPanel context={context} adapted={adapted} />
        <MatchScoreBar score={adapted.match_score} />
      </header>
      {adapted.section_order.map((name) => {
        const render = renderers[name];
        if (!render) return null;
        const inner = <div key={name}>{render()}</div>;
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
        return inner;
      })}
    </main>
  );
}
```

- [ ] **Step 3: Add failing test cases for new props**

Read `/home/dev/projects/agentfolio/web/src/__tests__/AdaptiveResume.test.tsx`. Append before the closing `});` of the `describe` block:

```typescript

  it('calls onCtaClick when email link is clicked', async () => {
    const onCtaClick = (await import('vitest')).vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <AdaptiveResume base={base} adapted={adapted} context={context} onCtaClick={onCtaClick} />,
    );
    await user.click(screen.getByText('verky.yi@gmail.com'));
    expect(onCtaClick).toHaveBeenCalledWith('email');
  });

  it('calls onProjectClick when a project link is clicked', async () => {
    const onProjectClick = (await import('vitest')).vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <AdaptiveResume
        base={base}
        adapted={adapted}
        context={context}
        onProjectClick={onProjectClick}
      />,
    );
    await user.click(screen.getByText('Project One'));
    expect(onProjectClick).toHaveBeenCalledWith('p1', 'url');
  });
```

- [ ] **Step 4: Run AdaptiveResume tests**

```bash
cd /home/dev/projects/agentfolio/web
npm test -- AdaptiveResume
```
Expected: PASS — 7 existing + 2 new = 9 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/AdaptiveResume.tsx web/src/components/ProjectsSection.tsx web/src/__tests__/AdaptiveResume.test.tsx
git commit -m "feat(web): add click callbacks to AdaptiveResume and ProjectsSection"
```

---

## Task 8: Wire the tracker into `App.tsx`

**Files:**
- Modify: `/home/dev/projects/agentfolio/web/src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Read `/home/dev/projects/agentfolio/web/src/App.tsx`. Replace the entire file with:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { useAdaptationProgress } from './hooks/useAdaptationProgress';
import { useBehaviorTracker } from './hooks/useBehaviorTracker';
import { AdaptiveResume } from './components/AdaptiveResume';
import { SelfIdPrompt } from './components/SelfIdPrompt';
import { AdaptationProgress } from './components/AdaptationProgress';
import {
  createAdaptRequest,
  findOpenRequestForCompany,
  getApiConfig,
} from './utils/githubApi';
import type { AdaptedResume, SectionName, VisitorContext } from './types';

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

  const shownAdapted = liveAdapted ?? adapted;

  const trackerEnabled =
    !!apiConfig && !!effectiveContext && !!shownAdapted && !needsSelfIdForm;

  const startCtx = useMemo(
    () =>
      shownAdapted && effectiveContext
        ? {
            company: effectiveContext.company,
            source: effectiveContext.source,
            adaptation: shownAdapted.company,
            match_score: shownAdapted.match_score.overall,
          }
        : { company: '', source: '', adaptation: '', match_score: 0 },
    [shownAdapted, effectiveContext],
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

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (needsSelfIdForm) {
    return (
      <main>
        <SelfIdPrompt onSubmit={setSelfId} />
      </main>
    );
  }

  if (!effectiveContext || !shownAdapted || !base) return <main>Loading…</main>;

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
      <AdaptiveResume
        base={base}
        adapted={shownAdapted}
        context={effectiveContext}
        onCtaClick={onCtaClick}
        onProjectClick={onProjectClick}
        onSectionDwell={trackerEnabled ? onSectionDwell : undefined}
      />
    </>
  );
}
```

- [ ] **Step 2: Run full suite**

```bash
cd /home/dev/projects/agentfolio/web
npm test
```
Expected: all tests pass. The existing `App.test.tsx` should still pass because it mocks fetch for all GitHub URLs; analytics fetches will hit the generic 404 catch-all which the tracker swallows.

If `App.test.tsx` tests fail because the tracker now fires during the integration test, adjust the test fetch mock to also accept `POST /issues` for analytics (already accepted by Phase 2 mock). The Phase 2 test already mocks `POST /issues` → returns `{number: 7}`, which is the same endpoint analytics uses. The tracker will create an issue; the test won't care.

Caveat: `useBehaviorTracker` will be created during `App.test.tsx` but `trackerEnabled` is only true after `shownAdapted` is set. In the "self-ID + live generation" test, `shownAdapted` becomes truthy after hot-swap. If this introduces unexpected analytics fetches to the mock, the test may still pass because the mock returns 200 for `POST /issues` regardless.

If build or tests fail, investigate and fix or report BLOCKED.

- [ ] **Step 3: Verify build**

```bash
cd /home/dev/projects/agentfolio/web
npm run build
```
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/App.tsx
git commit -m "feat(web): wire useBehaviorTracker and analytics events"
```

---

## Task 9: README privacy note

**Files:**
- Modify: `/home/dev/projects/agentfolio/README.md`

- [ ] **Step 1: Append a privacy section**

Read `/home/dev/projects/agentfolio/README.md`. Use Edit to append at the end of the file:

```markdown

## Analytics & privacy (Phase 3)

The site collects anonymous, aggregated engagement signals to help tune resume content over time. The loop runs entirely on GitHub infrastructure:

- **What is tracked:** session start (company, source, adaptation slug, match score), scroll depth, section dwell times, project-link clicks, contact-CTA clicks (email/LinkedIn/GitHub). Every flushed payload is visible as a GitHub Issue labeled `analytics` — fully auditable.
- **What is NOT tracked:** cookies, IP addresses, user-agent fingerprints, form inputs, chat text, content outside the site.
- **Storage:** events flush to a single GitHub Issue per session (first flush creates it, subsequent flushes append comments). No client-side persistence beyond `sessionStorage` for the session issue number.
- **Aggregation:** a weekly `analytics.yml` workflow runs `scripts/aggregate_feedback.py`, which collapses all open analytics issues into `data/analytics.json`, then closes them with the `analytics-processed` label.
- **Disable:** the tracker only fires when `VITE_GITHUB_PAT` is configured. Unset it to disable.
```

- [ ] **Step 2: Commit**

```bash
cd /home/dev/projects/agentfolio
git add README.md
git commit -m "docs: add analytics + privacy note"
```

---

## Task 10: Deploy + smoke test

**Files:** (no code — deployment + manual verification)

- [ ] **Step 1: Merge to main and push**

```bash
cd /home/dev/projects/agentfolio
git checkout main
git merge phase3-analytics-pipeline --ff-only
git push origin main
```

- [ ] **Step 2: Watch deploy workflow**

```bash
gh run watch --repo verkyyi/agentfolio --exit-status
```
Expected: deploy succeeds.

- [ ] **Step 3: Session smoke test**

1. Visit https://verkyyi.github.io/agentfolio/c/cohere-fde in an incognito window.
2. Scroll down slowly through all sections; click a project link; click the email CTA.
3. Close the tab (fires `visibilitychange → hidden`).
4. Within 5-10s, check https://github.com/verkyyi/agentfolio/issues — there should be a new issue `[analytics] <timestamp>` with label `analytics` and a JSON body containing your session events.

- [ ] **Step 4: Manual aggregation test**

Trigger the analytics workflow immediately:

```bash
gh workflow run analytics.yml --repo verkyyi/agentfolio
gh run watch --repo verkyyi/agentfolio --exit-status
```

Verify:
1. `data/analytics.json` is committed with a new `generated_at`.
2. The analytics issue is closed with the `analytics-processed` label.
3. `curl -s https://verkyyi.github.io/agentfolio/data/analytics.json | jq .total_sessions` returns ≥ 1.

- [ ] **Step 5: Document results**

Append a `## Smoke Test Results` section to `/home/dev/projects/agentfolio/docs/superpowers/plans/2026-04-15-phase3-analytics-pipeline.md` noting date, sessions captured, events observed, and any oddities. Commit:

```bash
git add docs/superpowers/plans/2026-04-15-phase3-analytics-pipeline.md
git commit -m "docs: record Phase 3 smoke test results"
git push origin main
```

---

## Acceptance Criteria

Phase 3 is complete when:

1. `python -m pytest scripts/tests/` passes (19 prior + 8 new = 27 tests).
2. `cd web && npm test` passes — every existing test still green plus new ones (trackingApi 2, useBehaviorTracker 6, SectionDwellTracker 3, AdaptiveResume +2 = 13 new web tests; full suite 57+).
3. `cd web && npm run build` succeeds.
4. A real browser session creates one `[analytics] ...` issue with labeled `analytics`; the issue body contains `session_start` and `session_heartbeat` events.
5. `gh workflow run analytics.yml` produces an updated `data/analytics.json` with the session counted, and closes the analytics issue with `analytics-processed` label.
6. `https://verkyyi.github.io/agentfolio/data/analytics.json` serves the committed file.
7. With `VITE_GITHUB_PAT` unset locally, the dev site renders fine and no analytics requests are sent.

---

## Follow-up Phases (out of scope for this plan)

- **Phase 4:** Chat widget with RAG over `resume.json`, domain-restricted LLM API key, client-side rate limit, `chat_question` analytics event.
- **Phase 5:** `/how-it-works` architecture page that reads `data/analytics.json` and renders the aggregated stats + pipeline diagrams + adaptation comparison. JD auto-fetch. LLM-powered summary rewriting. Richer match-score refinement.
