"""Adapt a base resume for a single company profile.

Pure functions (testable) + thin CLI wrapper.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "adapt_one.py v0.1"


def render_summary(base_resume: dict, profile: dict) -> str:
    template: str = base_resume["summary_template"]
    defaults: dict[str, str] = base_resume.get("summary_defaults", {})
    overrides: dict[str, str] = profile.get("summary_vars", {}) or {}
    merged = {**defaults, **{k: v for k, v in overrides.items() if v}}
    return template.format(**merged)


def pick_bullet_text(bullet: dict, company_slug: str) -> str:
    adaptations = bullet.get("adaptations") or {}
    override = adaptations.get(company_slug)
    if override:
        return override
    return bullet["text"]


def score_bullet_relevance(bullet: dict, priority_tags: list[str]) -> int:
    tags = set(bullet.get("tags") or [])
    return len(tags.intersection(priority_tags))


def order_experience_bullets(
    bullets: list[dict], priority_tags: list[str]
) -> list[dict]:
    indexed = list(enumerate(bullets))
    indexed.sort(
        key=lambda pair: (
            -score_bullet_relevance(pair[1], priority_tags),
            pair[0],
        )
    )
    return [b for _, b in indexed]


def score_skill_match(skill_items: list[str], profile: dict) -> int:
    emphasis = set(profile.get("skill_emphasis") or [])
    keywords = [k.lower() for k in (profile.get("jd_keywords") or [])]
    count = 0
    for item in skill_items:
        if item in emphasis:
            count += 1
            continue
        lowered = item.lower()
        if any(kw in lowered for kw in keywords):
            count += 1
    return count


def _normalize_company(profile: dict) -> str:
    return str(profile.get("company", "default")).strip().lower().replace(" ", "-")


def _match_score(base_resume: dict, profile: dict) -> dict:
    groups = base_resume["skills"]["groups"]
    by_category: dict[str, float] = {}
    total_matched = 0
    total_items = 0
    matched_keywords: set[str] = set()
    emphasis = set(profile.get("skill_emphasis") or [])
    keywords = [k.lower() for k in (profile.get("jd_keywords") or [])]

    for group in groups:
        items = group["items"]
        matched = score_skill_match(items, profile)
        by_category[group["id"]] = round(matched / len(items), 2) if items else 0.0
        total_matched += matched
        total_items += len(items)
        for item in items:
            if item in emphasis:
                matched_keywords.add(item)
            else:
                lowered = item.lower()
                for kw in keywords:
                    if kw in lowered:
                        matched_keywords.add(kw)

    overall = round(total_matched / total_items, 2) if total_items else 0.0
    profile_keywords = set(profile.get("jd_keywords") or [])
    missing = sorted(profile_keywords - {k for k in matched_keywords})
    return {
        "overall": overall,
        "by_category": by_category,
        "matched_keywords": sorted(matched_keywords),
        "missing_keywords": missing,
    }


def adapt(base_resume: dict, profile: dict) -> dict:
    company_slug = _normalize_company(profile)
    priority = profile.get("priority_tags") or []

    summary = render_summary(base_resume, profile)

    experience_order = [exp["id"] for exp in base_resume["experience"]]

    bullet_overrides: dict[str, str] = {}
    for exp in base_resume["experience"]:
        for bullet in exp["bullets"]:
            picked = pick_bullet_text(bullet, company_slug)
            if picked != bullet["text"]:
                bullet_overrides[bullet["id"]] = picked

    project_order = profile.get("project_order") or [
        p["id"] for p in base_resume["projects"]
    ]
    section_order = profile.get("section_order") or [
        "summary",
        "experience",
        "projects",
        "skills",
        "education",
        "volunteering",
    ]
    skill_emphasis = profile.get("skill_emphasis") or []

    # priority is referenced via order_experience_bullets in tests; keep exported usage minimal here
    _ = priority

    return {
        "company": profile.get("company", "default"),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generated_by": VERSION,
        "summary": summary,
        "section_order": section_order,
        "experience_order": experience_order,
        "bullet_overrides": bullet_overrides,
        "project_order": project_order,
        "skill_emphasis": skill_emphasis,
        "match_score": _match_score(base_resume, profile),
    }


def _load(path: Path) -> Any:
    return json.loads(path.read_text())


def _write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Adapt base resume for one company.")
    parser.add_argument("company_slug", help="Filename stem in data/companies/")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to repo root (default: auto-detected)",
    )
    args = parser.parse_args(argv)

    root = Path(args.repo_root)
    base = _load(root / "data" / "resume.json")
    profile_path = root / "data" / "companies" / f"{args.company_slug}.json"
    if not profile_path.exists():
        print(f"error: profile not found: {profile_path}", file=sys.stderr)
        return 2
    profile = _load(profile_path)

    adapted = adapt(base, profile)
    output_slug = _normalize_company(profile)
    out_path = root / "data" / "adapted" / f"{output_slug}.json"
    _write(out_path, adapted)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
