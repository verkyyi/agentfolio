"""Optionally polish a templated summary via Claude. Cached, deterministic, fail-soft."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path
from typing import Any

MAX_TOKENS = 200
SYSTEM_PROMPT = (
    "You are a resume editor. Rewrite the given summary to be tight, specific, and "
    "natural — preserving every concrete claim. Match the tone of the input keywords. "
    "Output ONLY the polished summary text, nothing else."
)


def cache_key(summary: str, keywords: list[str]) -> str:
    payload = summary + "\n" + "\n".join(sorted(set(keywords)))
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def polish_summary(
    summary: str,
    keywords: list[str],
    *,
    client: Any,
    model: str,
    cache_dir: Path,
) -> str:
    key = cache_key(summary, keywords)
    cache_path = cache_dir / f"{key}.txt"
    if cache_path.exists():
        return cache_path.read_text()

    user = f"Summary:\n{summary}\n\nKeywords (target tone):\n{', '.join(keywords)}"
    try:
        msg = client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            temperature=0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user}],
        )
        for block in msg.content:
            if getattr(block, "type", None) == "text":
                text = block.text.strip()
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(text)
                return text
        return summary
    except Exception as e:  # noqa: BLE001
        print(f"llm_polish: fallback to original due to {e}", file=sys.stderr)
        return summary
