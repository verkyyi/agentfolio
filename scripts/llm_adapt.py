"""Generate an adapted resume via a single Claude API call. Cached, no fallback."""

from __future__ import annotations

import hashlib
import json
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
    payload = f"{company.lower().strip()}\n{role.lower().strip()}\n{resume_str}"
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
