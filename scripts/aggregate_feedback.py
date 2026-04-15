"""Aggregate visitor analytics from GitHub Issues into data/analytics.json.

Pure function `aggregate()` for testing; thin HTTP shell `run()` for the workflow.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _extract_context(events: list[dict]) -> dict | None:
    for e in events:
        if e.get("type") == "session_start":
            return e.get("data", {})
    return None


def _mean(xs: list[float]) -> float:
    return round(sum(xs) / len(xs), 2) if xs else 0.0


def aggregate(sessions: list[dict]) -> dict:
    by_company: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "sessions": 0,
        "durations_s": [],
        "scrolls": [],
        "section_dwell_ms": defaultdict(list),
        "project_clicks": defaultdict(int),
        "cta_clicks": defaultdict(int),
    })
    global_project_clicks: dict[str, int] = defaultdict(int)
    global_section_ms: dict[str, list[float]] = defaultdict(list)
    global_durations_s: list[float] = []
    total = 0

    for session in sessions:
        events = session.get("events", [])
        ctx = _extract_context(events)
        if not ctx:
            continue
        company = ctx.get("company", "unknown")
        total += 1
        c = by_company[company]
        c["sessions"] += 1

        for e in events:
            t = e.get("type")
            d = e.get("data", {})
            if t == "session_heartbeat":
                c["durations_s"].append(d.get("duration_ms", 0) / 1000.0)
                global_durations_s.append(d.get("duration_ms", 0) / 1000.0)
                c["scrolls"].append(d.get("max_scroll_pct", 0))
            elif t == "section_dwell":
                section = d.get("section", "")
                ms = d.get("ms", 0)
                c["section_dwell_ms"][section].append(ms)
                global_section_ms[section].append(ms)
            elif t == "project_click":
                pid = d.get("project_id", "")
                c["project_clicks"][pid] += 1
                global_project_clicks[pid] += 1
            elif t == "cta_click":
                target = d.get("target", "")
                c["cta_clicks"][target] += 1

    by_company_out: dict[str, dict] = {}
    for company, c in by_company.items():
        by_company_out[company] = {
            "sessions": c["sessions"],
            "avg_duration_s": _mean(c["durations_s"]),
            "avg_max_scroll_pct": _mean(c["scrolls"]),
            "section_dwell_avg_s": {
                k: round(sum(v) / 1000.0 / len(v), 2) for k, v in c["section_dwell_ms"].items()
            },
            "project_clicks": dict(c["project_clicks"]),
            "cta_clicks": dict(c["cta_clicks"]),
        }

    # Sort descending by count; on ties sort descending by name (reverse alpha)
    top_projects = sorted(
        global_project_clicks.items(),
        key=lambda kv: (-kv[1], [-ord(c) for c in kv[0]]),
    )
    top_sections = sorted(
        ((k, round(sum(v) / 1000.0 / len(v), 2)) for k, v in global_section_ms.items()),
        key=lambda kv: -kv[1],
    )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_issues": total,
        "total_sessions": total,
        "unique_companies": len(by_company_out),
        "by_company": by_company_out,
        "global": {
            "avg_duration_s": _mean(global_durations_s),
            "top_projects": [[k, v] for k, v in top_projects],
            "top_sections": [[k, v] for k, v in top_sections],
        },
    }


def _api(method: str, path: str, token: str, body: dict | None = None) -> Any:
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "agentfolio-aggregate-feedback",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        text = resp.read().decode("utf-8")
        return json.loads(text) if text else None


def _parse_payload(body: str) -> dict | None:
    body = body.strip()
    if body.startswith("```"):
        body = body.strip("`")
        if body.startswith("json"):
            body = body[4:]
        body = body.strip()
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def _collect_sessions(repo: str, token: str) -> tuple[list[dict], list[int]]:
    sessions: list[dict] = []
    processed: list[int] = []
    page = 1
    while True:
        issues = _api(
            "GET",
            f"/repos/{repo}/issues?labels=analytics&state=open&per_page=100&page={page}",
            token,
        )
        if not issues:
            break
        for issue in issues:
            number = issue["number"]
            events: list[dict] = []
            body = _parse_payload(issue.get("body") or "")
            if body and "events" in body:
                events.extend(body["events"])
                session_id = body.get("session_id", f"issue-{number}")
            else:
                session_id = f"issue-{number}"

            comments = _api(
                "GET", f"/repos/{repo}/issues/{number}/comments?per_page=100", token
            ) or []
            for c in comments:
                cbody = _parse_payload(c.get("body") or "")
                if cbody and "events" in cbody:
                    events.extend(cbody["events"])

            sessions.append({"session_id": session_id, "events": events})
            processed.append(number)
        page += 1
    return sessions, processed


def _close_issues(numbers: list[int], repo: str, token: str) -> None:
    for n in numbers:
        _api("PATCH", f"/repos/{repo}/issues/{n}", token, {"state": "closed", "labels": ["analytics-processed"]})


def run(output_path: Path, repo: str, token: str) -> dict:
    sessions, processed = _collect_sessions(repo, token)
    result = aggregate(sessions)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2) + "\n")
    _close_issues(processed, repo, token)
    return result


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Aggregate analytics issues.")
    parser.add_argument("--output", default="data/analytics.json")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""))
    args = parser.parse_args(argv)

    if not args.repo or not args.token:
        print("repo and token required (set GITHUB_REPOSITORY and GITHUB_TOKEN)", file=sys.stderr)
        return 2

    result = run(Path(args.output), args.repo, args.token)
    print(f"wrote {args.output} — {result['total_sessions']} sessions across {result['unique_companies']} companies")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
