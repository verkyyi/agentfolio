"""Run adapt_one for every profile in data/companies/."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from scripts.adapt_one import _load, _normalize_company, _write, adapt


def _build_polish_fn(repo_root: Path, cache_dir: Path | None):
    """Build a shared polish_fn using a single Anthropic client + cache dir.

    Returns None if ANTHROPIC_API_KEY is missing (fail-soft — matches adapt_one).
    """
    import os

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print(
            "warn: --llm set but ANTHROPIC_API_KEY missing; skipping polish",
            file=sys.stderr,
        )
        return None

    from anthropic import Anthropic

    from scripts.llm_polish import polish_summary

    client = Anthropic(api_key=api_key)
    resolved_cache_dir = cache_dir if cache_dir else repo_root / "data" / "llm_cache"

    def polish_fn(s: str, k: list[str]) -> str:
        return polish_summary(
            s,
            k,
            client=client,
            model="claude-haiku-4-5",
            cache_dir=resolved_cache_dir,
        )

    return polish_fn


def run(
    repo_root: Path,
    *,
    llm: bool = False,
    cache_dir: Path | None = None,
) -> list[Path]:
    base = _load(repo_root / "data" / "resume.json")
    companies_dir = repo_root / "data" / "companies"
    adapted_dir = repo_root / "data" / "adapted"
    adapted_dir.mkdir(parents=True, exist_ok=True)

    polish_fn = _build_polish_fn(repo_root, cache_dir) if llm else None

    written: list[Path] = []
    for profile_path in sorted(companies_dir.glob("*.json")):
        profile = _load(profile_path)
        result = adapt(base, profile, polish_fn=polish_fn)
        out_path = adapted_dir / f"{_normalize_company(profile)}.json"
        _write(out_path, result)
        written.append(out_path)
        print(f"wrote {out_path}")
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Adapt base resume for every company profile."
    )
    parser.add_argument(
        "--llm",
        action="store_true",
        help="Polish each summary via Claude (requires ANTHROPIC_API_KEY)",
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help="Directory for LLM polish cache (default: <repo>/data/llm_cache)",
    )
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parents[1]
    cache_dir = Path(args.cache_dir) if args.cache_dir else None
    run(repo_root, llm=args.llm, cache_dir=cache_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
