# Zero-Runtime Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local-runtime quickstart with a zero-config GitHub-only flow: fork, add markdown files, set secrets, push, deployed.

**Architecture:** New `scripts/adapt_from_markdown.py` takes `data/resume.md` + `data/jd/*.md` and produces `data/adapted/*.json` + `data/slugs.json` via single LLM calls. Updated `adapt.yml` workflow triggers on markdown changes. `chat_answer.py` reads markdown instead of JSON. Frontend unchanged.

**Tech Stack:** Python, Anthropic SDK (Claude), GitHub Actions, existing React frontend

---

### Task 1: Create `scripts/adapt_from_markdown.py`

**Files:**
- Create: `scripts/adapt_from_markdown.py`
- Create: `scripts/tests/test_adapt_from_markdown.py`

- [ ] **Step 1: Write the test file**

Create `scripts/tests/test_adapt_from_markdown.py`:

```python
"""Tests for adapt_from_markdown — the markdown-to-adapted-JSON pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scripts.adapt_from_markdown import (
    adapt_one_from_markdown,
    adapt_all_from_markdown,
    generate_slugs_json,
    build_adaptation_prompt,
    build_default_prompt,
    parse_llm_response,
)


SAMPLE_RESUME_MD = """\
# Alex Chen
Software Engineer | San Francisco, CA
alex@example.com | github.com/alexchen

## Experience

### Senior Software Engineer — Acme Corp (2022–present)
- Led migration to microservices, reducing p99 latency by 40%
- Built real-time data pipeline processing 2M events/day

### Full-Stack Engineer — DataFlow Startup (2020–2022)
- Shipped analytics dashboard used by 500+ enterprise customers

## Skills
Python, TypeScript, Rust, AWS, Kafka, Docker
"""

SAMPLE_JD_MD = """\
# Data Platform Engineer — TechCo

We're looking for a Data Platform Engineer to build and scale our
real-time data infrastructure. You'll work with Kafka, Flink, and AWS.

Requirements:
- 3+ years with streaming data systems
- Experience with Python and distributed systems
- AWS infrastructure experience
"""

SAMPLE_LLM_RESPONSE = json.dumps({
    "basics": {
        "name": "Alex Chen",
        "label": "Software Engineer",
        "email": "alex@example.com",
        "summary": "Data platform engineer with 4+ years...",
        "location": {"city": "San Francisco", "region": "CA"},
        "profiles": [],
    },
    "work": [
        {
            "name": "Acme Corp",
            "position": "Senior Software Engineer",
            "startDate": "2022-06",
            "highlights": ["Built real-time data pipeline"],
        }
    ],
    "projects": [],
    "skills": [{"name": "Languages", "keywords": ["Python", "TypeScript"]}],
    "education": [],
    "volunteer": [],
    "meta": {
        "version": "1.0.0",
        "lastModified": "2026-01-01T00:00:00+00:00",
        "agentfolio": {
            "company": "TechCo",
            "role": "Data Platform Engineer",
            "generated_by": "adapt_from_markdown.py v1.0",
            "match_score": {
                "overall": 0.85,
                "by_category": {"languages": 0.7},
                "matched_keywords": ["Python", "Kafka"],
                "missing_keywords": ["Flink"],
            },
            "skill_emphasis": ["Kafka", "AWS"],
            "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
        },
    },
})


def _mock_client(response_text: str) -> MagicMock:
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = response_text
    msg = MagicMock()
    msg.content = [block]
    client.messages.create.return_value = msg
    return client


class TestBuildAdaptationPrompt:
    def test_includes_resume_and_jd(self):
        system, user = build_adaptation_prompt(SAMPLE_RESUME_MD, SAMPLE_JD_MD)
        assert "resume" in system.lower() or "resume" in user.lower()
        assert "Alex Chen" in user
        assert "TechCo" in user or "Data Platform" in user

    def test_system_prompt_requests_json(self):
        system, _ = build_adaptation_prompt(SAMPLE_RESUME_MD, SAMPLE_JD_MD)
        assert "JSON" in system


class TestBuildDefaultPrompt:
    def test_includes_resume_only(self):
        system, user = build_default_prompt(SAMPLE_RESUME_MD)
        assert "Alex Chen" in user
        assert "JSON" in system


class TestParseLlmResponse:
    def test_parses_valid_json(self):
        result = parse_llm_response(SAMPLE_LLM_RESPONSE)
        assert result["basics"]["name"] == "Alex Chen"
        assert result["meta"]["agentfolio"]["company"] == "TechCo"

    def test_strips_markdown_fences(self):
        wrapped = f"```json\n{SAMPLE_LLM_RESPONSE}\n```"
        result = parse_llm_response(wrapped)
        assert result["basics"]["name"] == "Alex Chen"

    def test_raises_on_invalid_json(self):
        with pytest.raises(ValueError):
            parse_llm_response("not json at all")


class TestAdaptOneFromMarkdown:
    def test_calls_llm_and_returns_adapted(self):
        client = _mock_client(SAMPLE_LLM_RESPONSE)
        result = adapt_one_from_markdown(
            resume_md=SAMPLE_RESUME_MD,
            jd_md=SAMPLE_JD_MD,
            client=client,
        )
        assert result["basics"]["name"] == "Alex Chen"
        assert client.messages.create.call_count == 1

    def test_default_adaptation_without_jd(self):
        client = _mock_client(SAMPLE_LLM_RESPONSE)
        result = adapt_one_from_markdown(
            resume_md=SAMPLE_RESUME_MD,
            jd_md=None,
            client=client,
        )
        assert result["basics"]["name"] == "Alex Chen"


class TestGenerateSlugsJson:
    def test_generates_from_adapted_meta(self):
        adapted = {
            "techco": {
                "meta": {
                    "agentfolio": {
                        "company": "TechCo",
                        "role": "Data Platform Engineer",
                    }
                }
            }
        }
        slugs = generate_slugs_json(adapted)
        assert "techco" in slugs
        assert slugs["techco"]["company"] == "TechCo"
        assert slugs["techco"]["role"] == "Data Platform Engineer"


class TestAdaptAllFromMarkdown:
    def test_processes_all_jds_and_default(self, tmp_path):
        # Set up data dir
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "resume.md").write_text(SAMPLE_RESUME_MD)
        jd_dir = data_dir / "jd"
        jd_dir.mkdir()
        (jd_dir / "techco.md").write_text(SAMPLE_JD_MD)

        client = _mock_client(SAMPLE_LLM_RESPONSE)
        results = adapt_all_from_markdown(data_dir, client=client)

        # One JD + one default = 2 calls
        assert client.messages.create.call_count == 2
        assert "techco" in results
        assert "default" in results
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_from_markdown.py -v 2>&1 | head -20
```

Expected: ImportError — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `scripts/adapt_from_markdown.py`:

```python
"""Adapt a resume from markdown sources via single LLM calls.

Reads data/resume.md + data/jd/*.md, produces data/adapted/*.json + data/slugs.json.
Each adaptation is a single LLM call — no intermediate JSON Resume authoring needed.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "adapt_from_markdown.py v1.0"
MAX_TOKENS = 8192

SYSTEM_PROMPT = """\
You are a resume adaptation engine. Given a candidate's resume (in any text format) \
and optionally a target job description, generate a complete JSON Resume document \
tailored for maximum relevance.

You MUST output valid JSON matching the schema below — nothing else, no markdown fences, no commentary.

## Output Schema

{{
  "basics": {{
    "name": "<extracted from resume>",
    "label": "<professional title>",
    "email": "<extracted from resume>",
    "phone": "<extracted or null>",
    "summary": "<FREE-FORM tailored summary, 2-3 sentences>",
    "location": {{ "city": "<city>", "region": "<state/region>", "countryCode": "<country code>" }},
    "profiles": [{{ "network": "<name>", "url": "<url>", "username": "<optional>" }}]
  }},
  "work": [
    {{
      "id": "<slug>",
      "name": "<company name>",
      "position": "<position>",
      "location": "<location>",
      "startDate": "<YYYY-MM>",
      "endDate": "<YYYY-MM or omit if current>",
      "highlights": ["<tailored bullet text>"]
    }}
  ],
  "projects": [
    {{
      "id": "<slug>",
      "name": "<project name>",
      "description": "<one-line description>",
      "url": "<url or omit>",
      "github": "<github url or omit>",
      "startDate": "<YYYY-MM>",
      "highlights": ["<tailored text>"],
      "keywords": ["<tech keywords>"]
    }}
  ],
  "skills": [
    {{ "id": "<slug>", "name": "<category>", "keywords": ["<skill1>", ...] }}
  ],
  "education": [
    {{ "institution": "<name>", "studyType": "<degree>", "area": "<field>", "location": "<location>", "startDate": "<YYYY-MM>", "endDate": "<YYYY-MM>" }}
  ],
  "volunteer": [
    {{ "organization": "<name>", "position": "<role>", "location": "<location>", "startDate": "<YYYY-MM>", "summary": "<description>" }}
  ],
  "meta": {{
    "version": "1.0.0",
    "lastModified": "<ISO 8601 timestamp>",
    "agentfolio": {{
      "company": "<target company name or 'default'>",
      "role": "<target role or null>",
      "generated_by": "{version}",
      "match_score": {{
        "overall": <0.0 to 1.0>,
        "by_category": {{ "<skill_id>": <0.0 to 1.0> }},
        "matched_keywords": ["<relevant keywords found>"],
        "missing_keywords": ["<required keywords not found>"]
      }},
      "skill_emphasis": ["<exact skill strings to highlight in UI>"],
      "section_order": ["basics", "<most relevant section>", ..., "<least relevant>"]
    }}
  }}
}}

## Constraints

- Extract ALL factual information from the resume — do not omit entries
- Work and project entries: order by relevance to the target role (most relevant first)
- Highlights: rewrite to emphasize relevance to target role, but keep factual claims intact
- Summary: specific to the target company/role, not generic
- match_score: honestly reflect how well the candidate fits
- section_order: must contain all 6 values, ordered by relevance to the role
- skill_emphasis: exact strings from the skills keywords list
- If no job description is provided, generate a generic adaptation with company="default"
"""

DEFAULT_SYSTEM_ADDENDUM = """
No job description is provided. Generate a generic adaptation:
- company: "default"
- role: null
- Summary should be a general professional summary
- match_score.overall: 0.5 (neutral)
- section_order: standard order ["basics", "work", "projects", "skills", "education", "volunteer"]
"""


def build_adaptation_prompt(resume_md: str, jd_md: str) -> tuple[str, str]:
    """Build system + user prompts for a company-specific adaptation."""
    system = SYSTEM_PROMPT.format(version=VERSION)
    user = f"## Candidate Resume\n\n{resume_md}\n\n## Target Job Description\n\n{jd_md}"
    return system, user


def build_default_prompt(resume_md: str) -> tuple[str, str]:
    """Build system + user prompts for the default (no-JD) adaptation."""
    system = SYSTEM_PROMPT.format(version=VERSION) + DEFAULT_SYSTEM_ADDENDUM
    user = f"## Candidate Resume\n\n{resume_md}"
    return system, user


def parse_llm_response(text: str) -> dict:
    """Parse LLM output as JSON, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}") from e


def adapt_one_from_markdown(
    resume_md: str,
    jd_md: str | None,
    *,
    client: Any,
    model: str = "claude-haiku-4-5",
) -> dict:
    """Run a single LLM call to adapt resume for one JD (or default)."""
    if jd_md is not None:
        system, user = build_adaptation_prompt(resume_md, jd_md)
    else:
        system, user = build_default_prompt(resume_md)

    msg = client.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        temperature=0,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    for block in msg.content:
        if getattr(block, "type", None) == "text":
            result = parse_llm_response(block.text)
            result.setdefault("meta", {})["lastModified"] = (
                datetime.now(timezone.utc).isoformat(timespec="seconds")
            )
            result.setdefault("meta", {}).setdefault("agentfolio", {})[
                "generated_by"
            ] = VERSION
            return result

    raise ValueError("LLM returned no text content")


def generate_slugs_json(adapted_results: dict[str, dict]) -> dict:
    """Generate slugs.json from adapted result metadata."""
    slugs = {}
    for slug, data in adapted_results.items():
        if slug == "default":
            continue
        meta = data.get("meta", {}).get("agentfolio", {})
        slugs[slug] = {
            "company": meta.get("company", slug),
            "role": meta.get("role"),
            "created": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "context": "auto-generated",
        }
    return slugs


def adapt_all_from_markdown(
    data_dir: Path,
    *,
    client: Any,
    model: str = "claude-haiku-4-5",
) -> dict[str, dict]:
    """Adapt resume for all JDs in data_dir/jd/ + generate default."""
    resume_md = (data_dir / "resume.md").read_text()
    jd_dir = data_dir / "jd"
    adapted_dir = data_dir / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, dict] = {}

    # Adapt for each JD
    if jd_dir.exists():
        for jd_path in sorted(jd_dir.glob("*.md")):
            slug = jd_path.stem
            jd_md = jd_path.read_text()
            print(f"adapting for {slug}...")
            result = adapt_one_from_markdown(
                resume_md, jd_md, client=client, model=model
            )
            out_path = adapted_dir / f"{slug}.json"
            out_path.write_text(
                json.dumps(result, indent=2, ensure_ascii=False) + "\n"
            )
            results[slug] = result
            print(f"  wrote {out_path}")

    # Generate default
    print("adapting default...")
    default_result = adapt_one_from_markdown(
        resume_md, None, client=client, model=model
    )
    default_path = adapted_dir / "default.json"
    default_path.write_text(
        json.dumps(default_result, indent=2, ensure_ascii=False) + "\n"
    )
    results["default"] = default_result
    print(f"  wrote {default_path}")

    # Generate slugs.json
    slugs = generate_slugs_json(results)
    slugs_path = data_dir / "slugs.json"
    slugs_path.write_text(json.dumps(slugs, indent=2, ensure_ascii=False) + "\n")
    print(f"  wrote {slugs_path}")

    return results


def main(argv: list[str] | None = None) -> int:
    import argparse
    import os

    parser = argparse.ArgumentParser(
        description="Adapt resume from markdown for all JDs."
    )
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).resolve().parents[1] / "data"),
        help="Path to data directory (default: auto-detected)",
    )
    parser.add_argument(
        "--model",
        default="claude-haiku-4-5",
        help="Anthropic model to use (default: claude-haiku-4-5)",
    )
    args = parser.parse_args(argv)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set", file=__import__("sys").stderr)
        return 2

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    adapt_all_from_markdown(Path(args.data_dir), client=client, model=args.model)
    return 0


if __name__ == "__main__":
    import sys

    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run the tests**

```bash
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_from_markdown.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/adapt_from_markdown.py scripts/tests/test_adapt_from_markdown.py
git commit -m "feat: add adapt_from_markdown.py for markdown-to-adapted-JSON pipeline"
```

---

### Task 2: Create Sample Markdown Data Files

**Files:**
- Create: `data/resume.md`
- Create: `data/jd/sample-company.md`
- Delete: `data/resume.json`

- [ ] **Step 1: Create sample resume.md**

Create `data/resume.md`:

```markdown
# Alex Chen
Software Engineer | San Francisco, CA
alex@example.com | (555) 123-4567
LinkedIn: https://linkedin.com/in/alexchen
GitHub: https://github.com/alexchen

## Experience

### Senior Software Engineer — Acme Corp (Jun 2022 – present)
San Francisco, CA
- Led migration of monolithic API to event-driven microservices architecture, reducing p99 latency by 40% and enabling independent team deployments.
- Built real-time data pipeline processing 2M events/day using Kafka and Flink, powering personalization features that increased user engagement by 25%.
- Mentored 3 junior engineers through structured pairing sessions, all promoted within 12 months.

### Full-Stack Engineer — DataFlow Startup (Jan 2020 – May 2022)
Remote
- Designed and shipped the core analytics dashboard used by 500+ enterprise customers, iterating on feedback from weekly customer calls.
- Implemented CI/CD pipeline with GitHub Actions reducing deploy time from 45 minutes to 8 minutes with automated rollback on failure.
- Built OAuth2/OIDC integration supporting 5 identity providers, enabling enterprise SSO adoption.

## Projects

### ML Model Monitor — https://github.com/alexchen/ml-monitor (Jan 2024)
Open-source ML model monitoring dashboard
- Built a real-time model drift detection system with configurable alerting thresholds, deployed on AWS Lambda for zero-ops monitoring.
- Designed a React dashboard visualizing prediction distributions, feature importance, and alert history across multiple model versions.
Keywords: machine-learning, monitoring, full-stack, open-source

### DevCLI Toolkit — https://github.com/alexchen/devcli (Jun 2023)
Developer productivity CLI tools
- Created a Rust-based CLI toolkit with sub-5ms startup time for common developer workflows: git branch cleanup, log tailing, and config management.
- Published to crates.io with 2,000+ downloads; maintained backward compatibility across 8 minor releases.
Keywords: cli, developer-tools, rust, open-source

## Skills
- Languages & Frameworks: TypeScript, Python, Rust, React, Node.js, FastAPI, SQL
- Infrastructure & DevOps: AWS, Docker, Kubernetes, GitHub Actions, Terraform, Kafka
- Data & ML: PostgreSQL, Redis, Apache Flink, scikit-learn, MLflow

## Education

### UC Berkeley — B.S. Computer Science (Aug 2016 – May 2020)
Berkeley, CA

## Volunteering

### Code for SF — Tech Lead (Jan 2023 – present)
San Francisco, CA
Led a team of 8 volunteers building civic tech tools for local nonprofits, delivering 3 projects in 12 months.
```

- [ ] **Step 2: Create sample JD**

Create `data/jd/sample-company.md`:

```markdown
# Data Platform Engineer — Sample Company

We're looking for a Data Platform Engineer to build and scale our real-time
data infrastructure. You'll design streaming pipelines, optimize data stores,
and build tooling that enables our product teams to move fast.

## Requirements
- 3+ years building data pipelines or streaming systems
- Strong Python and SQL skills
- Experience with Kafka, Flink, or similar streaming frameworks
- AWS infrastructure experience (EC2, S3, Lambda)
- Familiarity with Docker and Kubernetes

## Nice to have
- Experience with ML model serving or monitoring
- Rust or Go for performance-critical tooling
- Open-source contributions
```

- [ ] **Step 3: Delete resume.json and companies/ directory**

```bash
cd /home/dev/projects/agentfolio && git rm data/resume.json && git rm -r data/companies/
```

- [ ] **Step 4: Commit**

```bash
git add data/resume.md data/jd/
git commit -m "feat: add sample markdown resume and JD, remove resume.json and companies/"
```

---

### Task 3: Update `adapt.yml` Workflow

**Files:**
- Modify: `.github/workflows/adapt.yml`

- [ ] **Step 1: Rewrite adapt.yml**

Replace `.github/workflows/adapt.yml` with:

```yaml
name: Adapt Resumes
on:
  push:
    branches: [main]
    paths:
      - 'data/resume.md'
      - 'data/jd/**'
      - 'scripts/adapt_from_markdown.py'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  adapt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - run: pip install -r scripts/requirements.txt

      - name: Generate adaptations
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: python -m scripts.adapt_from_markdown

      - name: Commit generated files
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/adapted/ data/slugs.json
          if git diff --cached --quiet; then
            echo "no adaptation changes"
          else
            git commit -m "chore(adapt): regenerate adapted resumes from markdown"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/adapt.yml
git commit -m "feat: update adapt.yml to use markdown pipeline"
```

---

### Task 4: Update `chat_answer.py` to Read Markdown

**Files:**
- Modify: `scripts/chat_answer.py`
- Modify: `scripts/tests/test_chat_answer.py`

- [ ] **Step 1: Update chat_answer.py**

Change `build_system_prompt` to accept a string (markdown text) instead of a dict:

```python
def build_system_prompt(resume_text: str) -> str:
    # Try to extract name from first line of markdown
    first_line = resume_text.strip().split("\n")[0].lstrip("# ").strip()
    name = first_line if first_line and len(first_line) < 50 else "the candidate"
    return (
        f"You are a helpful assistant answering questions about {name}'s "
        "professional background. Use only the resume below as ground truth. "
        "If the resume does not contain the answer, say so — do not invent. "
        "Keep answers concise (1-3 sentences).\n\n"
        f"RESUME:\n{resume_text}"
    )
```

Change `answer` to accept `resume_text: str` instead of `resume: dict`:

```python
def answer(question: str, resume_text: str, client: _ClientLike, model: str) -> str:
    q = question[:MAX_QUESTION_CHARS]
    msg = client.messages.create(
        model=model,
        max_tokens=MAX_ANSWER_TOKENS,
        system=build_system_prompt(resume_text),
        messages=[{"role": "user", "content": q}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""
```

Change `main` to read `data/resume.md`:

```python
def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Answer one chat question.")
    parser.add_argument("--question", required=True)
    parser.add_argument("--resume", default="data/resume.md")
    parser.add_argument("--model", default="claude-haiku-4-5")
    args = parser.parse_args(argv)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 2

    try:
        from anthropic import Anthropic
    except ImportError:
        print("anthropic package not installed", file=sys.stderr)
        return 3

    client = Anthropic(api_key=api_key)
    resume_text = Path(args.resume).read_text()
    text = answer(args.question, resume_text, client, args.model)
    print(text)
    return 0
```

Remove `_load_json` helper (no longer needed). Remove `import json` (no longer needed).

- [ ] **Step 2: Update test_chat_answer.py**

Read the current test file and update:
- `build_system_prompt` calls to pass a string instead of a dict
- `answer` calls to pass a string instead of a dict
- Remove any JSON-specific assertions

The tests should pass a markdown string like `"# Alex Chen\nalex@example.com\n\n## Experience\n..."` instead of a dict.

- [ ] **Step 3: Run tests**

```bash
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_chat_answer.py -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/chat_answer.py scripts/tests/test_chat_answer.py
git commit -m "feat: update chat_answer.py to read markdown instead of JSON"
```

---

### Task 5: Update README and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update README quickstart**

Replace the Quick Start section in `README.md` with:

```markdown
## Quick Start

1. **Fork** this repo
2. **Replace** `data/resume.md` with your resume (any format — paste from LinkedIn, PDF text, or write markdown)
3. **Add target positions** in `data/jd/` — one `.md` file per role, filename becomes the URL slug (e.g., `data/jd/google.md` → `yoursite.com/c/google`)
4. **Set secrets** on your fork:
   - `ANTHROPIC_API_KEY` — for AI-powered adaptation ([get one here](https://console.anthropic.com/settings/keys))
   - `GH_ISSUES_PAT` — fine-grained PAT with `issues:read+write` for analytics and chat ([create one here](https://github.com/settings/personal-access-tokens/new))
5. **Push** — GitHub Actions generates adapted resumes and deploys to GitHub Pages

No local runtime needed. No JSON to write. Just markdown and push.
```

Also update the Personalization section:

```markdown
## Personalization

All personal data lives in `data/`. Replace these files with your own:

| File | Purpose |
|------|---------|
| `data/resume.md` | Your resume in any text format |
| `data/jd/*.md` | Target positions (one .md per role, filename = URL slug) |
| `data/adapted/*.json` | Auto-generated by GitHub Actions — don't edit |
| `data/slugs.json` | Auto-generated from `data/jd/` filenames — don't edit |

Framework code in `web/`, `scripts/`, and `.github/` is generic — you shouldn't need to modify it.
```

- [ ] **Step 2: Update CLAUDE.md**

Update the project structure section to reflect `resume.md` and `jd/` instead of `resume.json` and `companies/`. Update the "How to Personalize" section:

```markdown
## How to Personalize

1. Replace `data/resume.md` with your resume (any text format)
2. Add target JDs in `data/jd/` (one `.md` per role, filename = URL slug)
3. Set secrets: `ANTHROPIC_API_KEY` and `GH_ISSUES_PAT`
4. Push — GitHub Actions generates adaptations and deploys
```

Update the "Key Conventions" section to mention that `resume.md` is the source of truth (not `resume.json`).

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for zero-runtime quickstart"
```

---

### Task 6: Update Unit and E2E Tests

**Files:**
- Modify: `web/e2e/adaptation-access.spec.ts`
- Verify: `web/src/__tests__/App.test.tsx` (should still pass — frontend unchanged)

- [ ] **Step 1: Verify unit tests still pass**

The frontend reads `data/adapted/*.json` and `data/slugs.json` which are still generated in the same format. No frontend changes were made.

```bash
cd /home/dev/projects/agentfolio/web && npx vitest run
```

Expected: all 62 tests pass.

- [ ] **Step 2: Run Python tests**

```bash
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/ -v
```

Expected: all tests pass (including new adapt_from_markdown tests and updated chat_answer tests).

- [ ] **Step 3: Commit any fixes if needed**

---

### Task 7: Full Verification

**Files:** None (verification only)

- [ ] **Step 1: Type-check frontend**

```bash
cd /home/dev/projects/agentfolio/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all frontend tests**

```bash
cd /home/dev/projects/agentfolio/web && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run all Python tests**

```bash
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/ -v
```

Expected: all tests pass.

- [ ] **Step 4: Verify data directory structure**

```bash
ls data/resume.md data/jd/sample-company.md data/adapted/default.json data/adapted/sample-company.json data/slugs.json
```

Expected: all files exist.

- [ ] **Step 5: Verify resume.json is gone**

```bash
test ! -f data/resume.json && echo "resume.json removed" || echo "ERROR: resume.json still exists"
```

Expected: "resume.json removed"

- [ ] **Step 6: Build the site**

```bash
cd /home/dev/projects/agentfolio/web && npm run build
```

Expected: builds successfully (adapted JSON files still exist and are copied by build step).
