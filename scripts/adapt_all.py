"""Run adapt_one for every profile in data/companies/."""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.adapt_one import _load, _normalize_company, _write, adapt


def run(repo_root: Path) -> list[Path]:
    base = _load(repo_root / "data" / "resume.json")
    companies_dir = repo_root / "data" / "companies"
    adapted_dir = repo_root / "data" / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for profile_path in sorted(companies_dir.glob("*.json")):
        profile = _load(profile_path)
        result = adapt(base, profile)
        out_path = adapted_dir / f"{_normalize_company(profile)}.json"
        _write(out_path, result)
        written.append(out_path)
        print(f"wrote {out_path}")
    return written


def main() -> int:
    run(Path(__file__).resolve().parents[1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
