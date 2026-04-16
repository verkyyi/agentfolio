"""Generate an adapted resume via a single Claude API call. Cached, no fallback."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "llm_adapt.py v2.0"

MAX_TOKENS = 4096

SYSTEM_PROMPT = """\
You are a resume adaptation engine. Given a candidate's base resume and a target company/role, \
generate a complete JSON Resume document tailored for maximum relevance.

You MUST output valid JSON matching the schema below — nothing else, no markdown fences, no commentary.

## Output Schema

{{
  "basics": {{
    "name": "<from resume>",
    "label": "<from resume>",
    "email": "<from resume>",
    "phone": "<from resume>",
    "summary": "<FREE-FORM tailored summary, 2-3 sentences>",
    "location": {{<from resume>}},
    "profiles": [<from resume>]
  }},
  "work": [
    {{
      "name": "<company name>",
      "position": "<position>",
      "location": "<location>",
      "startDate": "<ISO date>",
      "endDate": "<ISO date or omit if current>",
      "highlights": ["<tailored bullet text>", ...]
    }}
  ],
  "projects": [
    {{
      "name": "<project name>",
      "description": "<description>",
      "url": "<url>",
      "startDate": "<ISO date>",
      "highlights": ["<tailored text>"],
      "keywords": ["<tech keywords>"]
    }}
  ],
  "skills": [
    {{ "name": "<category>", "keywords": ["<skill1>", ...] }}
  ],
  "education": [<copy from resume>],
  "volunteer": [<copy from resume>],
  "meta": {{
    "version": "1.0.0",
    "lastModified": "<ISO 8601 timestamp>",
    "agentfolio": {{
      "company": "<target company>",
      "generated_by": "llm_adapt.py v2.0",
      "match_score": {{
        "overall": <0.0 to 1.0>,
        "by_category": {{<skill_id: 0.0 to 1.0>}},
        "matched_keywords": [<relevant keywords>],
        "missing_keywords": [<missing keywords>]
      }},
      "skill_emphasis": [<exact skill strings to highlight>],
      "section_order": [<ordered: "basics", "work", "projects", "skills", "education", "volunteer">]
    }}
  }}
}}

## Constraints

- Work entries order matters — most relevant first (arrange the work array accordingly)
- Project entries order matters — most relevant first (arrange the projects array accordingly)
- skill_emphasis items must be exact strings from the resume's skill keywords
- match_score.by_category keys must be skill id values from: {group_ids}
- section_order must contain all 6 values: "basics", "work", "projects", "skills", "education", "volunteer"
- Keep factual claims intact when rewriting highlights
- The summary should be specific to the company and role, not generic
- match_score should honestly reflect how well the candidate fits the role
"""


def cache_key(company: str, role: str, base_resume: dict) -> str:
    resume_str = json.dumps(base_resume, sort_keys=True)
    payload = f"{company.lower().strip()}\n{role.lower().strip()}\n{resume_str}"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _extract_ids(base_resume: dict) -> dict[str, list[str]]:
    group_ids = [s["id"] for s in base_resume["skills"]]
    return {
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
            result.setdefault("meta", {})["lastModified"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            result.setdefault("meta", {}).setdefault("agentfolio", {})["generated_by"] = VERSION
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
            return result

    raise ValueError("LLM returned no text content")
