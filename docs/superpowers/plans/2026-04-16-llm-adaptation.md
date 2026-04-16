# LLM-Powered Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deterministic adaptation pipeline with a single LLM call that generates the full adapted resume directly from company+role+resume.json.

**Architecture:** New `scripts/llm_adapt.py` module handles the LLM call with caching. `adapt_on_request.py` is simplified to write a minimal `companies/{slug}.json` input record, call `generate_adaptation()`, and write the result. `adapt_all.py` is updated to use the same LLM path. Existing company profiles are trimmed to `{company, role}` only.

**Tech Stack:** Python 3.11, anthropic SDK (already in requirements.txt), pytest

---

### Task 1: Create `scripts/llm_adapt.py` — core module

**Files:**
- Create: `scripts/llm_adapt.py`
- Test: `scripts/tests/test_llm_adapt.py`

- [ ] **Step 1: Write the test file with cache and API tests**

```python
# scripts/tests/test_llm_adapt.py
import json
import hashlib
from pathlib import Path

from scripts.llm_adapt import generate_adaptation, cache_key

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_resume():
    return json.loads((REPO_ROOT / "data" / "resume.json").read_text())


def _valid_adaptation():
    resume = _load_resume()
    exp_ids = [e["id"] for e in resume["experience"]]
    proj_ids = [p["id"] for p in resume["projects"]]
    bullet_ids = [b["id"] for e in resume["experience"] for b in e["bullets"]]
    skill_items = [item for g in resume["skills"]["groups"] for item in g["items"]]
    group_ids = [g["id"] for g in resume["skills"]["groups"]]
    return {
        "company": "Stripe",
        "generated_at": "2026-04-16T00:00:00+00:00",
        "generated_by": "llm_adapt.py v1.0",
        "summary": "A tailored summary for Stripe.",
        "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
        "experience_order": exp_ids,
        "bullet_overrides": {bullet_ids[0]: "Rewritten bullet for Stripe."},
        "project_order": proj_ids,
        "skill_emphasis": [skill_items[0], skill_items[1]],
        "match_score": {
            "overall": 0.75,
            "by_category": {gid: 0.5 for gid in group_ids},
            "matched_keywords": ["Python"],
            "missing_keywords": ["Ruby"],
        },
    }


def test_cache_key_is_deterministic():
    a = cache_key("Stripe", "FDE", {"name": "test"})
    b = cache_key("Stripe", "FDE", {"name": "test"})
    assert a == b


def test_cache_key_differs_for_different_inputs():
    a = cache_key("Stripe", "FDE", {"name": "test"})
    b = cache_key("Google", "FDE", {"name": "test"})
    assert a != b


def test_generate_adaptation_returns_cached_result(tmp_path):
    resume = _load_resume()
    expected = _valid_adaptation()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    key = cache_key("Stripe", "FDE", resume)
    (cache_dir / f"{key}.json").write_text(json.dumps(expected))

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                raise AssertionError("should not call API on cache hit")
        messages = Messages()

    result = generate_adaptation(
        "Stripe", "FDE", resume,
        client=FakeClient(), cache_dir=cache_dir,
    )
    assert result["company"] == "Stripe"
    assert result["summary"] == expected["summary"]


def test_generate_adaptation_calls_api_and_caches(tmp_path):
    resume = _load_resume()
    expected = _valid_adaptation()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeMessage:
        def __init__(self, text):
            self.content = [type("C", (), {"text": text, "type": "text"})]

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                assert kwargs.get("temperature") == 0
                return FakeMessage(json.dumps(expected))
        messages = Messages()

    result = generate_adaptation(
        "Stripe", "FDE", resume,
        client=FakeClient(), cache_dir=cache_dir,
    )
    assert result["company"] == "Stripe"
    assert "summary" in result
    assert "match_score" in result

    # Verify it was cached
    key = cache_key("Stripe", "FDE", resume)
    assert (cache_dir / f"{key}.json").exists()


def test_generate_adaptation_propagates_error(tmp_path):
    resume = _load_resume()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                raise RuntimeError("api down")
        messages = Messages()

    try:
        generate_adaptation(
            "Stripe", "FDE", resume,
            client=FakeClient(), cache_dir=cache_dir,
        )
        assert False, "should have raised"
    except RuntimeError as e:
        assert "api down" in str(e)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_llm_adapt.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.llm_adapt'`

- [ ] **Step 3: Write the implementation**

```python
# scripts/llm_adapt.py
"""Generate an adapted resume via a single Claude API call. Cached, no fallback."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "llm_adapt.py v1.0"

MAX_TOKENS = 4096

SYSTEM_PROMPT = """\
You are a resume adaptation engine. Given a candidate's base resume and a target company/role, \
generate an adapted resume JSON that tailors the content for maximum relevance.

You MUST output valid JSON matching the schema below — nothing else, no markdown fences, no commentary.

## Output Schema

{{
  "company": "<company name>",
  "generated_at": "<ISO 8601 timestamp>",
  "generated_by": "llm_adapt.py v1.0",
  "summary": "<free-form tailored professional summary, 2-3 sentences>",
  "section_order": [<ordered list of exactly these 6 values: "summary", "experience", "projects", "skills", "education", "volunteering">],
  "experience_order": [<ordered list of experience IDs, most relevant first>],
  "bullet_overrides": {{<bullet_id: rewritten text tailored to the company — only include bullets worth rewriting>}},
  "project_order": [<ordered list of project IDs, most relevant first>],
  "skill_emphasis": [<list of exact skill strings from the resume to highlight>],
  "match_score": {{
    "overall": <0.0 to 1.0>,
    "by_category": {{<skill_group_id: 0.0 to 1.0>}},
    "matched_keywords": [<keywords from the resume relevant to this role>],
    "missing_keywords": [<keywords the role likely needs that aren't in the resume>]
  }}
}}

## Constraints

- section_order must contain all 6 sections, reordered by relevance
- experience_order values must be from: {experience_ids}
- project_order values must be from: {project_ids}
- bullet_overrides keys must be from: {bullet_ids}
- skill_emphasis items must be exact strings from the resume's skill groups
- match_score.by_category keys must be from: {group_ids}
- Rewrite bullets to emphasize aspects relevant to the target company/role — keep factual claims intact
- The summary should be specific to the company and role, not generic
- match_score should honestly reflect how well the candidate fits the role
"""


def cache_key(company: str, role: str, base_resume: dict) -> str:
    resume_str = json.dumps(base_resume, sort_keys=True)
    payload = f"{company.lower().strip()}\\n{role.lower().strip()}\\n{resume_str}"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _extract_ids(base_resume: dict) -> dict[str, list[str]]:
    experience_ids = [e["id"] for e in base_resume["experience"]]
    project_ids = [p["id"] for p in base_resume["projects"]]
    bullet_ids = [b["id"] for e in base_resume["experience"] for b in e["bullets"]]
    group_ids = [g["id"] for g in base_resume["skills"]["groups"]]
    return {
        "experience_ids": json.dumps(experience_ids),
        "project_ids": json.dumps(project_ids),
        "bullet_ids": json.dumps(bullet_ids),
        "group_ids": json.dumps(group_ids),
    }


def generate_adaptation(
    company: str,
    role: str,
    base_resume: dict,
    *,
    client: Any,
    model: str = "claude-haiku-4-5",
    cache_dir: Path,
) -> dict:
    key = cache_key(company, role, base_resume)
    cache_path = cache_dir / f"{key}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text())

    ids = _extract_ids(base_resume)
    system = SYSTEM_PROMPT.format(**ids)
    user = (
        f"## Target\nCompany: {company}\nRole: {role}\n\n"
        f"## Base Resume\n{json.dumps(base_resume, indent=2)}"
    )

    msg = client.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        temperature=0,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    for block in msg.content:
        if getattr(block, "type", None) == "text":
            text = block.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(text)
            result["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            result["generated_by"] = VERSION
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
            return result

    raise ValueError("LLM returned no text content")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_llm_adapt.py -v`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/llm_adapt.py scripts/tests/test_llm_adapt.py
git commit -m "feat(adapt): add llm_adapt module for LLM-powered adaptation"
```

---

### Task 2: Rewrite `scripts/adapt_on_request.py` to use LLM path

**Files:**
- Modify: `scripts/adapt_on_request.py`
- Modify: `scripts/tests/test_adapt_on_request.py`

- [ ] **Step 1: Rewrite the test file**

```python
# scripts/tests/test_adapt_on_request.py
import json
from pathlib import Path
from unittest.mock import patch

from scripts.adapt_on_request import run

REPO_ROOT = Path(__file__).resolve().parents[2]


def _fake_adaptation():
    resume = json.loads((REPO_ROOT / "data" / "resume.json").read_text())
    exp_ids = [e["id"] for e in resume["experience"]]
    proj_ids = [p["id"] for p in resume["projects"]]
    group_ids = [g["id"] for g in resume["skills"]["groups"]]
    return {
        "company": "Stripe",
        "generated_at": "2026-04-16T00:00:00+00:00",
        "generated_by": "llm_adapt.py v1.0",
        "summary": "Tailored for Stripe.",
        "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
        "experience_order": exp_ids,
        "bullet_overrides": {},
        "project_order": proj_ids,
        "skill_emphasis": ["Python"],
        "match_score": {
            "overall": 0.75,
            "by_category": {gid: 0.5 for gid in group_ids},
            "matched_keywords": ["Python"],
            "missing_keywords": [],
        },
    }


def test_run_writes_company_and_adapted_json(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        company_path, adapted_path = run(
            company="Stripe",
            role="Forward Deployed Engineer",
            repo_root=tmp_path,
        )

    assert company_path == tmp_path / "data" / "companies" / "stripe.json"
    assert adapted_path == tmp_path / "data" / "adapted" / "stripe.json"
    assert company_path.exists()
    assert adapted_path.exists()

    company = json.loads(company_path.read_text())
    assert company == {"company": "Stripe", "role": "Forward Deployed Engineer"}

    adapted = json.loads(adapted_path.read_text())
    assert adapted["company"] == "Stripe"
    assert adapted["summary"] == "Tailored for Stripe."


def test_run_normalizes_slug(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    fake = _fake_adaptation()
    fake["company"] = "Scale AI"
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        company_path, adapted_path = run(
            company="Scale AI",
            role="FDE",
            repo_root=tmp_path,
        )

    assert company_path.name == "scale-ai.json"
    assert adapted_path.name == "scale-ai.json"


def test_run_updates_slugs_registry(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "slugs.json").write_text(json.dumps({}))

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        run(company="Stripe", role="FDE", repo_root=tmp_path)

    slugs = json.loads((tmp_path / "data" / "slugs.json").read_text())
    assert "stripe" in slugs
    assert slugs["stripe"]["company"] == "stripe"
    assert slugs["stripe"]["context"] == "Auto-generated from self-ID"


def test_run_does_not_overwrite_existing_slug(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    existing = {"stripe": {"company": "stripe", "role": "FDE", "created": "2026-01-01", "context": "Manual"}}
    (tmp_path / "data" / "slugs.json").write_text(json.dumps(existing))

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        run(company="Stripe", role="FDE", repo_root=tmp_path)

    slugs = json.loads((tmp_path / "data" / "slugs.json").read_text())
    assert slugs["stripe"]["context"] == "Manual"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_on_request.py -v`
Expected: FAIL — imports still reference old `build_profile`

- [ ] **Step 3: Rewrite `adapt_on_request.py`**

```python
# scripts/adapt_on_request.py
"""Generate an adapted resume on demand from (company, role).

Used by the `adapt-on-request.yml` workflow, triggered by a GitHub Issue.
Writes the company input record, generates the adaptation via LLM,
and updates the slug registry.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from scripts.adapt_one import _load, _write


def _normalize(company: str) -> str:
    return company.strip().lower().replace(" ", "-")


def run(company: str, role: str, repo_root: Path) -> tuple[Path, Path]:
    base_resume = _load(repo_root / "data" / "resume.json")

    slug = _normalize(company)
    company_path = repo_root / "data" / "companies" / f"{slug}.json"
    adapted_path = repo_root / "data" / "adapted" / f"{slug}.json"

    _write(company_path, {"company": company, "role": role})

    from anthropic import Anthropic

    from scripts.llm_adapt import generate_adaptation

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    cache_dir = repo_root / "data" / "llm_cache"

    result = generate_adaptation(
        company, role, base_resume,
        client=client, cache_dir=cache_dir,
    )
    _write(adapted_path, result)

    slugs_path = repo_root / "data" / "slugs.json"
    if slugs_path.exists():
        registry = json.loads(slugs_path.read_text())
    else:
        registry = {}
    if slug not in registry:
        registry[slug] = {
            "company": slug,
            "role": role,
            "created": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "context": "Auto-generated from self-ID",
        }
        _write(slugs_path, registry)

    return company_path, adapted_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Adapt on request.")
    parser.add_argument("company")
    parser.add_argument("role")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
    )
    args = parser.parse_args(argv)

    company_path, adapted_path = run(
        company=args.company,
        role=args.role,
        repo_root=Path(args.repo_root),
    )
    print(f"COMPANY_PATH={company_path.relative_to(args.repo_root)}")
    print(f"ADAPTED_PATH={adapted_path.relative_to(args.repo_root)}")
    print(f"COMPANY_SLUG={adapted_path.stem}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_on_request.py -v`
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/adapt_on_request.py scripts/tests/test_adapt_on_request.py
git commit -m "feat(adapt): rewrite adapt_on_request to use LLM path"
```

---

### Task 3: Update `adapt-on-request.yml` workflow

**Files:**
- Modify: `.github/workflows/adapt-on-request.yml`

- [ ] **Step 1: Add `ANTHROPIC_API_KEY` env var to the "Run adaptation" step**

In `.github/workflows/adapt-on-request.yml`, find the "Run adaptation" step (around line 107) and add the env var:

```yaml
      - name: Run adaptation
        id: run
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          python -m scripts.adapt_on_request "${{ steps.parse.outputs.company }}" "${{ steps.parse.outputs.role }}" > /tmp/adapt.out
          cat /tmp/adapt.out
          SLUG=$(grep '^COMPANY_SLUG=' /tmp/adapt.out | cut -d= -f2)
          PATH_OUT=$(grep '^ADAPTED_PATH=' /tmp/adapt.out | cut -d= -f2)
          echo "slug=$SLUG" >> $GITHUB_OUTPUT
          echo "adapted_path=$PATH_OUT" >> $GITHUB_OUTPUT
```

- [ ] **Step 2: Verify the `git add` line already includes all needed paths**

Confirm this line (around line 132) includes `data/companies/`, `data/adapted/`, and `data/slugs.json`:
```yaml
          git add data/companies/ data/adapted/ data/slugs.json
```

This was already updated in a prior commit — just verify it's correct.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/adapt-on-request.yml
git commit -m "ci(adapt): add ANTHROPIC_API_KEY to live adaptation workflow"
```

---

### Task 4: Rewrite `scripts/adapt_all.py` to use LLM path

**Files:**
- Modify: `scripts/adapt_all.py`
- Modify: `scripts/tests/test_adapt_all.py`

- [ ] **Step 1: Rewrite the test file**

```python
# scripts/tests/test_adapt_all.py
import json
from pathlib import Path
from unittest.mock import patch

from scripts.adapt_all import main, run

REPO_ROOT = Path(__file__).resolve().parents[2]


def _write_minimal_repo(tmp_path: Path) -> None:
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "alpha.json").write_text(
        json.dumps({"company": "Alpha", "role": "Engineer"})
    )
    (tmp_path / "data" / "companies" / "beta.json").write_text(
        json.dumps({"company": "Beta", "role": "Designer"})
    )


def _fake_result(company: str) -> dict:
    return {
        "company": company,
        "generated_at": "2026-04-16T00:00:00+00:00",
        "generated_by": "llm_adapt.py v1.0",
        "summary": f"Summary for {company}",
        "section_order": ["summary", "experience", "projects", "skills", "education", "volunteering"],
        "experience_order": [],
        "bullet_overrides": {},
        "project_order": [],
        "skill_emphasis": [],
        "match_score": {"overall": 0.5, "by_category": {}, "matched_keywords": [], "missing_keywords": []},
    }


def test_run_generates_one_file_per_company(tmp_path):
    _write_minimal_repo(tmp_path)

    def fake_generate(company, role, resume, *, client, cache_dir):
        return _fake_result(company)

    with patch("scripts.adapt_all.generate_adaptation", side_effect=fake_generate):
        with patch("scripts.adapt_all.Anthropic"):
            written = run(repo_root=tmp_path)

    assert sorted(p.name for p in written) == ["alpha.json", "beta.json"]
    assert (tmp_path / "data" / "adapted" / "alpha.json").exists()
    assert (tmp_path / "data" / "adapted" / "beta.json").exists()

    alpha = json.loads((tmp_path / "data" / "adapted" / "alpha.json").read_text())
    assert alpha["summary"] == "Summary for Alpha"


def test_main_forwards_cache_dir(tmp_path):
    captured: dict = {}

    def fake_run(repo_root, *, cache_dir=None):
        captured["cache_dir"] = cache_dir
        return []

    with patch("scripts.adapt_all.run", side_effect=fake_run):
        rc = main(["--cache-dir", str(tmp_path / "cache")])

    assert rc == 0
    assert captured["cache_dir"] == tmp_path / "cache"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_all.py -v`
Expected: FAIL — old imports/signatures don't match

- [ ] **Step 3: Rewrite `adapt_all.py`**

```python
# scripts/adapt_all.py
"""Run LLM adaptation for every company in data/companies/."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from scripts.adapt_one import _load, _write


def _normalize(company: str) -> str:
    return company.strip().lower().replace(" ", "-")


def run(
    repo_root: Path,
    *,
    cache_dir: Path | None = None,
) -> list[Path]:
    from anthropic import Anthropic

    from scripts.llm_adapt import generate_adaptation

    base_resume = _load(repo_root / "data" / "resume.json")
    companies_dir = repo_root / "data" / "companies"
    adapted_dir = repo_root / "data" / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resolved_cache_dir = cache_dir if cache_dir else repo_root / "data" / "llm_cache"

    written: list[Path] = []
    for company_path in sorted(companies_dir.glob("*.json")):
        company_data = _load(company_path)
        company = company_data.get("company", "default")
        role = company_data.get("role")
        if company == "default" or not role:
            continue

        result = generate_adaptation(
            company, role, base_resume,
            client=client, cache_dir=resolved_cache_dir,
        )
        slug = _normalize(company)
        out_path = adapted_dir / f"{slug}.json"
        _write(out_path, result)
        written.append(out_path)
        print(f"wrote {out_path}")
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Adapt base resume for every company via LLM."
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help="Directory for LLM cache (default: <repo>/data/llm_cache)",
    )
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parents[1]
    cache_dir = Path(args.cache_dir) if args.cache_dir else None
    run(repo_root, cache_dir=cache_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_all.py -v`
Expected: all 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/adapt_all.py scripts/tests/test_adapt_all.py
git commit -m "feat(adapt): rewrite adapt_all to use LLM path"
```

---

### Task 5: Trim existing company profiles and regenerate adaptations

**Files:**
- Modify: `data/companies/cohere.json`
- Modify: `data/companies/openai.json`
- Modify: `data/companies/apple.json`
- Modify: `data/companies/default.json`

- [ ] **Step 1: Trim company profiles to minimal schema**

Overwrite each file:

`data/companies/cohere.json`:
```json
{
  "company": "Cohere",
  "role": "FDE, Agentic Platform"
}
```

`data/companies/openai.json`:
```json
{
  "company": "OpenAI",
  "role": "Forward Deployed Engineer"
}
```

`data/companies/apple.json`:
```json
{
  "company": "Apple",
  "role": "Software Engineer"
}
```

`data/companies/default.json`:
```json
{
  "company": "default",
  "role": null
}
```

- [ ] **Step 2: Regenerate adapted resumes using the new LLM path**

Run: `cd /home/dev/projects/agentfolio && ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY python -m scripts.adapt_all`
Expected: writes `data/adapted/cohere.json`, `data/adapted/openai.json`, `data/adapted/apple.json`. Skips `default.json` (no role).

- [ ] **Step 3: Verify the generated adaptations have the expected shape**

Run: `python -c "import json; d=json.load(open('data/adapted/cohere.json')); assert all(k in d for k in ['summary','section_order','experience_order','bullet_overrides','project_order','skill_emphasis','match_score']); print('OK')"`
Expected: `OK`

- [ ] **Step 4: Verify `data/adapted/default.json` is unchanged**

The default adaptation is a static generic resume — it's not regenerated by `adapt_all.py` (which skips entries with no role). Verify it still exists and hasn't been modified:

Run: `test -f data/adapted/default.json && echo "OK" || echo "MISSING"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add data/companies/ data/adapted/
git commit -m "chore(adapt): trim company profiles to minimal schema, regenerate via LLM"
```

---

### Task 6: Update `adapt.yml` scheduled workflow

**Files:**
- Modify: `.github/workflows/adapt.yml`

- [ ] **Step 1: Check current adapt.yml**

Read `.github/workflows/adapt.yml` to understand the current scheduled workflow.

- [ ] **Step 2: Update to use `adapt_all.py` without `--llm` flag**

The `--llm` flag is no longer needed since `adapt_all.py` now always uses the LLM path. Update the workflow to just call `python -m scripts.adapt_all` and ensure `ANTHROPIC_API_KEY` is set.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/adapt.yml
git commit -m "ci(adapt): update scheduled workflow for LLM-only path"
```

---

### Task 7: Run full test suite and verify

- [ ] **Step 1: Run all Python tests**

Run: `cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/ -v`
Expected: all tests PASS

- [ ] **Step 2: Run frontend tests (if any break due to adapted JSON changes)**

Run: `cd /home/dev/projects/agentfolio/web && npx vitest run`
Expected: all tests PASS

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: test suite cleanup after LLM adaptation migration"
```
