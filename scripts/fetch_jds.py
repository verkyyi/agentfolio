"""Fetch job-description pages, extract canonical keywords, write back to company profiles.

Pure functions: `detect_platform(url)`, `extract_keywords(text)`, `merge_profile(profile, keywords)`.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Iterable

# Curated vocabulary mirroring what we adapt against. Keep small and focused.
KEYWORD_VOCAB: tuple[str, ...] = (
    "Python", "TypeScript", "JavaScript", "Go", "Rust", "Java",
    "React", "Node.js", "FastAPI", "Django",
    "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform",
    "RAG", "agents", "agentic", "LLM", "evaluation", "fine-tuning",
    "MCP", "OpenAI", "Anthropic", "Claude",
    "PostgreSQL", "Redis", "Kafka",
    "REST", "gRPC", "GraphQL",
    "production", "scalability", "deploy", "enterprise", "customer",
    "private cloud", "North platform",
)


def detect_platform(url: str) -> str:
    u = url.lower()
    if "ashbyhq.com" in u:
        return "ashby"
    if "greenhouse.io" in u:
        return "greenhouse"
    if "lever.co" in u:
        return "lever"
    return "generic"


def _strip_html(html: str) -> str:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return html
    soup = BeautifulSoup(html, "html.parser")
    for s in soup(["script", "style"]):
        s.decompose()
    return soup.get_text(" ", strip=True)


def extract_keywords(text_or_html: str) -> list[str]:
    if "<" in text_or_html and ">" in text_or_html:
        text = _strip_html(text_or_html)
    else:
        text = text_or_html
    lower = text.lower()
    found: list[str] = []
    for term in KEYWORD_VOCAB:
        if term.lower() in lower and term not in found:
            found.append(term)
    return found


def fetch_jd_text(url: str, timeout: float = 15.0) -> tuple[int, str]:
    """Returns (status_code, text). Network call isolated for easy mocking."""
    import requests
    res = requests.get(url, timeout=timeout, headers={"User-Agent": "agentfolio-jd-sync"})
    return res.status_code, res.text


def merge_profile(profile: dict, keywords: list[str], stale: bool) -> dict:
    """Returns updated profile dict. If stale=True, keep previous keywords and set stale=true.
    Otherwise overwrite jd_keywords with the new list and set stale=false + jd_fetched=today."""
    out = dict(profile)
    if stale:
        out["stale"] = True
        return out
    out["jd_keywords"] = keywords
    out["jd_fetched"] = date.today().isoformat()
    out["stale"] = False
    return out


def _process_one(profile_path: Path, fetch=fetch_jd_text) -> tuple[str, bool]:
    """Returns (slug, changed). Side effect: writes back the profile if changed."""
    profile = json.loads(profile_path.read_text())
    url = profile.get("jd_url")
    slug = profile_path.stem
    if not url:
        return slug, False
    try:
        status, body = fetch(url)
    except Exception as e:  # noqa: BLE001
        print(f"{slug}: fetch error: {e}", file=sys.stderr)
        new_profile = merge_profile(profile, [], stale=True)
    else:
        if status >= 400:
            print(f"{slug}: HTTP {status}, marking stale", file=sys.stderr)
            new_profile = merge_profile(profile, [], stale=True)
        else:
            kws = extract_keywords(body)
            new_profile = merge_profile(profile, kws, stale=False)
    if new_profile == profile:
        return slug, False
    profile_path.write_text(json.dumps(new_profile, indent=2, ensure_ascii=False) + "\n")
    return slug, True


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch JDs and update jd_keywords for each company profile.")
    parser.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--only", help="Process only this company slug")
    args = parser.parse_args(argv)

    root = Path(args.repo_root)
    profiles_dir = root / "data" / "companies"
    paths: Iterable[Path]
    if args.only:
        paths = [profiles_dir / f"{args.only}.json"]
    else:
        paths = sorted(profiles_dir.glob("*.json"))

    changed = []
    for p in paths:
        if not p.exists():
            print(f"skip: missing {p}", file=sys.stderr)
            continue
        if p.stem == "default":
            continue  # default has no jd_url
        slug, did = _process_one(p)
        if did:
            changed.append(slug)
    print(f"changed: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
