"""Generate an adapted resume on demand from (company, role).

Used by the `adapt-on-request.yml` workflow, triggered by a GitHub Issue.
Writes the company input record, generates the adaptation via LLM,
and updates the slug registry.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from scripts.adapt_one import _load, _write
from scripts.llm_adapt import generate_adaptation


def _normalize(company: str) -> str:
    return company.strip().lower().replace(" ", "-")


def run(company: str, role: str, repo_root: Path) -> tuple[Path, Path]:
    base_resume = _load(repo_root / "data" / "resume.json")

    slug = _normalize(company)
    company_path = repo_root / "data" / "companies" / f"{slug}.json"
    adapted_path = repo_root / "data" / "adapted" / f"{slug}.json"

    _write(company_path, {"company": company, "role": role})

    from anthropic import Anthropic

    client = Anthropic()
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
