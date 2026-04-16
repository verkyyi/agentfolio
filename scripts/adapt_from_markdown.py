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
