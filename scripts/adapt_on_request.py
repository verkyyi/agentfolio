"""Generate an adapted resume on demand from (company, role).

Used by the `adapt-on-request.yml` workflow, triggered by a GitHub Issue.
Writes both the company profile (so future scheduled runs regenerate) and
the adapted JSON (so the next visitor loads instantly).
"""

from __future__ import annotations

import argparse
import copy
import sys
from pathlib import Path

from scripts.adapt_one import _load, _normalize_company, _write, adapt


def build_profile(company: str, role: str, default_profile: dict) -> dict:
    profile = copy.deepcopy(default_profile)
    profile["company"] = company
    profile["role"] = role
    return profile


def run(company: str, role: str, repo_root: Path) -> tuple[Path, Path]:
    base = _load(repo_root / "data" / "resume.json")
    default = _load(repo_root / "data" / "companies" / "default.json")

    profile = build_profile(company, role, default)
    slug = _normalize_company(profile)

    profile_path = repo_root / "data" / "companies" / f"{slug}.json"
    adapted_path = repo_root / "data" / "adapted" / f"{slug}.json"

    _write(profile_path, profile)
    result = adapt(base, profile)
    _write(adapted_path, result)

    return profile_path, adapted_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Adapt on request.")
    parser.add_argument("company")
    parser.add_argument("role")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
    )
    args = parser.parse_args(argv)

    profile_path, adapted_path = run(
        company=args.company,
        role=args.role,
        repo_root=Path(args.repo_root),
    )
    # Workflow greps for these lines
    print(f"PROFILE_PATH={profile_path.relative_to(args.repo_root)}")
    print(f"ADAPTED_PATH={adapted_path.relative_to(args.repo_root)}")
    print(f"COMPANY_SLUG={adapted_path.stem}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
