"""Run LLM adaptation for every company in data/companies/."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from anthropic import Anthropic

from scripts.adapt_one import _load, _write
from scripts.llm_adapt import generate_adaptation


def _normalize(company: str) -> str:
    return company.strip().lower().replace(" ", "-")


def run(
    repo_root: Path,
    *,
    cache_dir: Path | None = None,
) -> list[Path]:
    base_resume = _load(repo_root / "data" / "resume.json")
    companies_dir = repo_root / "data" / "companies"
    adapted_dir = repo_root / "data" / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
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
