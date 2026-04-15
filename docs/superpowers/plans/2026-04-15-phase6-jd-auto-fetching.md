# AgentFolio Phase 6: JD Auto-Fetching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Auto-refresh `jd_keywords` on each company profile by re-fetching its `jd_url` daily. Profiles whose URL 404s are flagged `stale: true` but keep their last-known keywords so adaptation never regresses.

**Architecture:** A pure `extract_keywords(html_or_json) -> list[str]` function handles each known JD platform (Ashby, Greenhouse, Lever, generic HTML). A CLI `fetch_jds.py` iterates `data/companies/*.json`, fetches each `jd_url`, runs the extractor, and writes back the diff. A daily `jd-sync.yml` workflow runs the CLI and commits any diffs (which then triggers `adapt.yml` via push).

**Tech Stack:** Python 3.11 · `requests` + `beautifulsoup4` (already in requirements? if not, add). No new browser/JS — Ashby and Greenhouse expose JSON/SSR'd HTML.

**Out of scope:** auto-discovering new JDs, parsing PDFs, scoring keyword quality.

---

## File Structure

```
agentfolio/
├── scripts/
│   ├── fetch_jds.py                     # NEW
│   ├── requirements.txt                 # MODIFY: add requests, beautifulsoup4
│   └── tests/
│       └── test_fetch_jds.py            # NEW
└── .github/workflows/
    └── jd-sync.yml                      # NEW: daily cron
```

---

## Task 1: `extract_keywords` pure function + tests

**Files:**
- Create: `scripts/fetch_jds.py`
- Create: `scripts/tests/test_fetch_jds.py`
- Modify: `scripts/requirements.txt`

- [ ] **Step 1:** Append to `scripts/requirements.txt`:

```
requests==2.32.3
beautifulsoup4==4.12.3
```

- [ ] **Step 2:** Write failing tests `scripts/tests/test_fetch_jds.py`:

```python
import pytest
from scripts.fetch_jds import extract_keywords, detect_platform, KEYWORD_VOCAB


def test_detect_platform_ashby():
    assert detect_platform("https://jobs.ashbyhq.com/cohere/abc") == "ashby"


def test_detect_platform_greenhouse():
    assert detect_platform("https://boards.greenhouse.io/openai/jobs/123") == "greenhouse"


def test_detect_platform_lever():
    assert detect_platform("https://jobs.lever.co/anthropic/abc") == "lever"


def test_detect_platform_generic():
    assert detect_platform("https://example.com/jobs/123") == "generic"


def test_extract_keywords_picks_known_vocab():
    text = "We are hiring a Python engineer with experience in RAG, agents, and AWS."
    kws = extract_keywords(text)
    assert "Python" in kws
    assert "RAG" in kws
    assert "agents" in kws
    assert "AWS" in kws


def test_extract_keywords_dedupes_case_insensitive():
    text = "python python PYTHON Python"
    kws = extract_keywords(text)
    assert kws.count("Python") == 1


def test_extract_keywords_empty_when_no_match():
    assert extract_keywords("blah blah unrelated text") == []


def test_keyword_vocab_includes_core_terms():
    # Sanity: vocab covers the keywords used by existing profiles
    assert "Python" in KEYWORD_VOCAB
    assert "RAG" in KEYWORD_VOCAB
    assert "agents" in KEYWORD_VOCAB
```

- [ ] **Step 3:** Run `cd /home/dev/projects/agentfolio && python3 -m pytest scripts/tests/test_fetch_jds.py -v` — confirm FAIL.

- [ ] **Step 4:** Implement `scripts/fetch_jds.py`:

```python
"""Fetch job-description pages, extract canonical keywords, write back to company profiles.

Pure functions: `detect_platform(url)`, `extract_keywords(text)`, `merge_profile(profile, keywords)`.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Iterable

# Curated vocabulary mirroring what we adapt against. Keep small and focused.
KEYWORD_VOCAB: tuple[str, ...] = (
    "Python", "TypeScript", "JavaScript", "Go", "Rust", "Java",
    "React", "Node.js", "FastAPI", "Django",
    "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform",
    "RAG", "agents", "agentic", "LLM", "evaluation", "fine-tuning",
    "MCP", "OpenAI", "Anthropic", "Claude",
    "PostgreSQL", "Redis", "Kafka",
    "REST", "gRPC", "GraphQL",
    "production", "scalability", "deploy", "enterprise", "customer",
    "private cloud", "North platform",
)


def detect_platform(url: str) -> str:
    u = url.lower()
    if "ashbyhq.com" in u:
        return "ashby"
    if "greenhouse.io" in u:
        return "greenhouse"
    if "lever.co" in u:
        return "lever"
    return "generic"


def _strip_html(html: str) -> str:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return html
    soup = BeautifulSoup(html, "html.parser")
    for s in soup(["script", "style"]):
        s.decompose()
    return soup.get_text(" ", strip=True)


def extract_keywords(text_or_html: str) -> list[str]:
    if "<" in text_or_html and ">" in text_or_html:
        text = _strip_html(text_or_html)
    else:
        text = text_or_html
    lower = text.lower()
    found: list[str] = []
    for term in KEYWORD_VOCAB:
        if term.lower() in lower and term not in found:
            found.append(term)
    return found


def fetch_jd_text(url: str, timeout: float = 15.0) -> tuple[int, str]:
    """Returns (status_code, text). Network call isolated for easy mocking."""
    import requests
    res = requests.get(url, timeout=timeout, headers={"User-Agent": "agentfolio-jd-sync"})
    return res.status_code, res.text


def merge_profile(profile: dict, keywords: list[str], stale: bool) -> dict:
    """Returns updated profile dict. If stale=True, keep previous keywords and set stale=true.
    Otherwise overwrite jd_keywords with the new list and set stale=false + jd_fetched=today."""
    out = dict(profile)
    if stale:
        out["stale"] = True
        return out
    out["jd_keywords"] = keywords
    out["jd_fetched"] = date.today().isoformat()
    out["stale"] = False
    return out


def _process_one(profile_path: Path, fetch=fetch_jd_text) -> tuple[str, bool]:
    """Returns (slug, changed). Side effect: writes back the profile if changed."""
    profile = json.loads(profile_path.read_text())
    url = profile.get("jd_url")
    slug = profile_path.stem
    if not url:
        return slug, False
    try:
        status, body = fetch(url)
    except Exception as e:  # noqa: BLE001
        print(f"{slug}: fetch error: {e}", file=sys.stderr)
        new_profile = merge_profile(profile, [], stale=True)
    else:
        if status >= 400:
            print(f"{slug}: HTTP {status}, marking stale", file=sys.stderr)
            new_profile = merge_profile(profile, [], stale=True)
        else:
            kws = extract_keywords(body)
            new_profile = merge_profile(profile, kws, stale=False)
    if new_profile == profile:
        return slug, False
    profile_path.write_text(json.dumps(new_profile, indent=2, ensure_ascii=False) + "\n")
    return slug, True


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch JDs and update jd_keywords for each company profile.")
    parser.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--only", help="Process only this company slug")
    args = parser.parse_args(argv)

    root = Path(args.repo_root)
    profiles_dir = root / "data" / "companies"
    paths: Iterable[Path]
    if args.only:
        paths = [profiles_dir / f"{args.only}.json"]
    else:
        paths = sorted(profiles_dir.glob("*.json"))

    changed = []
    for p in paths:
        if not p.exists():
            print(f"skip: missing {p}", file=sys.stderr)
            continue
        if p.stem == "default":
            continue  # default has no jd_url
        slug, did = _process_one(p)
        if did:
            changed.append(slug)
    print(f"changed: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 5:** Run `python3 -m pytest scripts/tests/test_fetch_jds.py -v` — expect 8 PASS.

- [ ] **Step 6:** Run full pytest: `python3 -m pytest scripts/tests/ -v` — expect 30 + 8 = 38.

- [ ] **Step 7:** Commit:
```
git add scripts/fetch_jds.py scripts/tests/test_fetch_jds.py scripts/requirements.txt
git commit -m "feat(jd): add fetch_jds CLI and keyword extractor"
```

---

## Task 2: `merge_profile` integration tests with mocked fetch

**Files:**
- Modify: `scripts/tests/test_fetch_jds.py`

- [ ] **Step 1:** Append to test file:

```python
def test_merge_profile_overwrites_keywords_on_success():
    profile = {"company": "X", "jd_url": "https://x", "jd_keywords": ["old"], "jd_fetched": "2026-01-01"}
    out = merge_profile(profile, ["Python", "RAG"], stale=False)
    assert out["jd_keywords"] == ["Python", "RAG"]
    assert out["stale"] is False
    assert out["jd_fetched"] != "2026-01-01"


def test_merge_profile_keeps_keywords_when_stale():
    profile = {"company": "X", "jd_keywords": ["Python"], "jd_fetched": "2026-01-01"}
    out = merge_profile(profile, [], stale=True)
    assert out["jd_keywords"] == ["Python"]   # untouched
    assert out["stale"] is True
    assert out["jd_fetched"] == "2026-01-01"   # untouched


def test_process_one_writes_back_on_change(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    p.write_text(json.dumps({"company": "X", "jd_url": "https://x", "jd_keywords": []}))
    fake = lambda url, timeout=15.0: (200, "We need Python and RAG.")
    slug, changed = _process_one(p, fetch=fake)
    assert changed is True
    updated = json.loads(p.read_text())
    assert "Python" in updated["jd_keywords"]
    assert "RAG" in updated["jd_keywords"]


def test_process_one_marks_stale_on_404(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    p.write_text(json.dumps({"company": "X", "jd_url": "https://x", "jd_keywords": ["LLM"]}))
    fake = lambda url, timeout=15.0: (404, "")
    _process_one(p, fetch=fake)
    updated = json.loads(p.read_text())
    assert updated["stale"] is True
    assert updated["jd_keywords"] == ["LLM"]   # preserved


def test_process_one_no_change_returns_false(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    initial = {"company": "X", "jd_url": "https://x", "jd_keywords": ["Python"], "jd_fetched": date.today().isoformat(), "stale": False}
    p.write_text(json.dumps(initial))
    fake = lambda url, timeout=15.0: (200, "Python only.")
    slug, changed = _process_one(p, fetch=fake)
    assert changed is False
```

Add `from datetime import date` and `import json` at top of test file.

- [ ] **Step 2:** Run `python3 -m pytest scripts/tests/test_fetch_jds.py -v` — expect 13 PASS total.

- [ ] **Step 3:** Commit:
```
git add scripts/tests/test_fetch_jds.py
git commit -m "test(jd): add merge + process_one tests with mocked fetch"
```

---

## Task 3: `jd-sync.yml` daily workflow

**Files:**
- Create: `.github/workflows/jd-sync.yml`

- [ ] **Step 1:** Create workflow:

```yaml
name: JD Sync
on:
  schedule:
    - cron: '17 5 * * *'   # 05:17 UTC daily
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r scripts/requirements.txt
      - name: Fetch JDs
        run: python -m scripts.fetch_jds
      - name: Commit diffs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if git diff --quiet -- data/companies; then
            echo "no JD changes"
            exit 0
          fi
          git add data/companies/
          git commit -m "chore(jd): refresh keywords from upstream JDs"
          git push
```

- [ ] **Step 2:** Validate YAML:
```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/jd-sync.yml')); print('valid yaml')"
```

- [ ] **Step 3:** Commit:
```
git add .github/workflows/jd-sync.yml
git commit -m "ci: add daily jd-sync workflow"
```

---

## Task 4: Deploy + manual smoke test

- [ ] **Step 1:** Merge to main + push.
- [ ] **Step 2:** Trigger `jd-sync.yml` manually: `gh workflow run jd-sync.yml --repo verkyyi/agentfolio`
- [ ] **Step 3:** Watch run; expect either "no JD changes" (real-world Cohere URL likely 404 since the original was a placeholder hash) → `stale: true` flagged on cohere/openai profiles. That's a *correct* outcome and proves the safety net.
- [ ] **Step 4:** Verify `data/companies/cohere.json` either updated or marked stale.

---

## Acceptance Criteria

1. `python -m pytest scripts/tests/` passes (38 tests).
2. `python -m scripts.fetch_jds --only cohere` works locally without crashing on a 404.
3. `jd-sync.yml` runs without secrets beyond `GITHUB_TOKEN`.
4. Stale profiles preserve their previous `jd_keywords`.
