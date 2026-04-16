"""Answer a question about the resume using Anthropic Claude.

Pure functions: `build_system_prompt(resume) -> str`, `answer(question, resume, client, model) -> str`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Protocol

MAX_QUESTION_CHARS = 2000
MAX_ANSWER_TOKENS = 500


class _ClientLike(Protocol):
    @property
    def messages(self) -> Any: ...


def build_system_prompt(resume: dict) -> str:
    name = resume.get("basics", {}).get("name", "the candidate")
    return (
        f"You are a helpful assistant answering questions about {name}'s "
        "professional background. Use only the resume JSON below as ground truth. "
        "If the resume does not contain the answer, say so — do not invent. "
        "Keep answers concise (1-3 sentences).\n\n"
        f"RESUME:\n{json.dumps(resume, ensure_ascii=False)}"
    )


def answer(question: str, resume: dict, client: _ClientLike, model: str) -> str:
    q = question[:MAX_QUESTION_CHARS]
    msg = client.messages.create(
        model=model,
        max_tokens=MAX_ANSWER_TOKENS,
        system=build_system_prompt(resume),
        messages=[{"role": "user", "content": q}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Answer one chat question.")
    parser.add_argument("--question", required=True)
    parser.add_argument("--resume", default="data/resume.json")
    parser.add_argument("--model", default="claude-haiku-4-5")
    args = parser.parse_args(argv)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 2

    try:
        from anthropic import Anthropic
    except ImportError:
        print("anthropic package not installed", file=sys.stderr)
        return 3

    client = Anthropic(api_key=api_key)
    resume = _load_json(Path(args.resume))
    text = answer(args.question, resume, client, args.model)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
