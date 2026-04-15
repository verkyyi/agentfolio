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


SKILL_WEIGHT = 1.0
BULLET_WEIGHT = 6.0
PROJECT_WEIGHT = 6.0


def _matches_keyword_or_emphasis(item: str, profile: dict) -> str | None:
    """Return the matched keyword/emphasis string, or None."""
    emphasis = set(profile.get("skill_emphasis") or [])
    if item in emphasis:
        return item
    keywords = [k for k in (profile.get("jd_keywords") or [])]
    lowered = item.lower()
    for kw in keywords:
        if kw.lower() in lowered:
            return kw
    return None


def _skill_matches(base_resume: dict, profile: dict):
    matched = 0
    total = 0
    by_category: dict[str, float] = {}
    matched_terms: set[str] = set()
    for group in base_resume["skills"]["groups"]:
        items = group["items"]
        local = sum(1 for it in items if _matches_keyword_or_emphasis(it, profile))
        for it in items:
            t = _matches_keyword_or_emphasis(it, profile)
            if t:
                matched_terms.add(t)
        by_category[group["id"]] = round(local / len(items), 2) if items else 0.0
        matched += local
        total += len(items)
    return matched, total, by_category, matched_terms


def _tag_matches(items: list[dict], profile: dict, tag_field: str = "tags"):
    """Items are objects with a .tags list (bullets, projects)."""
    keywords = {k.lower() for k in (profile.get("jd_keywords") or [])}
    priority = {p.lower() for p in (profile.get("priority_tags") or [])}
    needles = keywords | priority
    matched = 0
    matched_terms: set[str] = set()
    for it in items:
        for tag in it.get(tag_field) or []:
            if tag.lower() in needles:
                matched += 1
                matched_terms.add(tag)
                break  # at most 1 per item
    return matched, len(items), matched_terms


def _match_score(base_resume: dict, profile: dict) -> dict:
    skill_matched, skill_total, by_category, skill_terms = _skill_matches(
        base_resume, profile
    )

    all_bullets = [b for exp in base_resume["experience"] for b in exp["bullets"]]
    bullet_matched, bullet_total, bullet_terms = _tag_matches(all_bullets, profile)
    by_category["experience_bullets"] = (
        round(bullet_matched / bullet_total, 2) if bullet_total else 0.0
    )

    project_matched, project_total, project_terms = _tag_matches(
        base_resume["projects"], profile
    )
    by_category["projects"] = (
        round(project_matched / project_total, 2) if project_total else 0.0
    )

    weighted_matched = (
        SKILL_WEIGHT * skill_matched
        + BULLET_WEIGHT * bullet_matched
        + PROJECT_WEIGHT * project_matched
    )
    weighted_total = (
        SKILL_WEIGHT * skill_total
        + BULLET_WEIGHT * bullet_total
        + PROJECT_WEIGHT * project_total
    )
    overall = round(weighted_matched / weighted_total, 2) if weighted_total else 0.0

    matched_terms = sorted(skill_terms | bullet_terms | project_terms)
    profile_keywords = set(profile.get("jd_keywords") or [])
    missing = sorted(profile_keywords - set(matched_terms))

    return {
        "overall": overall,
        "by_category": by_category,
        "matched_keywords": matched_terms,
        "missing_keywords": missing,
    }


def adapt(base_resume: dict, profile: dict, polish_fn=None) -> dict:
    company_slug = _normalize_company(profile)
    priority = profile.get("priority_tags") or []

    summary = render_summary(base_resume, profile)
    if polish_fn is not None:
        summary = polish_fn(summary, profile.get("jd_keywords") or [])

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
    parser.add_argument(
        "--llm",
        action="store_true",
        help="Polish summary via Claude (requires ANTHROPIC_API_KEY)",
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help="Directory for LLM polish cache (default: <repo>/data/llm_cache)",
    )
    args = parser.parse_args(argv)

    root = Path(args.repo_root)
    base = _load(root / "data" / "resume.json")
    profile_path = root / "data" / "companies" / f"{args.company_slug}.json"
    if not profile_path.exists():
        print(f"error: profile not found: {profile_path}", file=sys.stderr)
        return 2
    profile = _load(profile_path)

    polish_fn = None
    if args.llm:
        import os

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print(
                "warn: --llm set but ANTHROPIC_API_KEY missing; skipping polish",
                file=sys.stderr,
            )
        else:
            from anthropic import Anthropic

            from scripts.llm_polish import polish_summary

            client = Anthropic(api_key=api_key)
            cache_dir = Path(args.cache_dir) if args.cache_dir else root / "data" / "llm_cache"

            def polish_fn(s: str, k: list[str]) -> str:
                return polish_summary(
                    s,
                    k,
                    client=client,
                    model="claude-haiku-4-5",
                    cache_dir=cache_dir,
                )

    adapted = adapt(base, profile, polish_fn=polish_fn)
    output_slug = _normalize_company(profile)
    out_path = root / "data" / "adapted" / f"{output_slug}.json"
    _write(out_path, adapted)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
