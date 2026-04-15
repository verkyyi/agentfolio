# AgentFolio Phase 7: LLM Summary Rewriting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Optionally polish the rendered summary via Claude after template substitution. Gated behind `--llm` CLI flag so unit tests stay deterministic. Cached on `(base_summary, sorted_keywords)` hash to avoid re-spending on identical inputs.

**Architecture:** Add a `polish_summary(summary, keywords, *, client, model, cache_dir) -> str` pure function in a new module `scripts/llm_polish.py`. `adapt_one.py` calls it only when `--llm` is passed. Cache is a JSON file keyed by SHA1 of `(summary, sorted(keywords))`. Cache miss → call Anthropic, write result. Cache hit → return cached.

**Tech Stack:** Python 3.11 · `anthropic` (already added Phase 4) · Claude Haiku 4.5 (cheap, fast) · temperature=0 for max determinism within a given input.

**Prerequisites:** `ANTHROPIC_API_KEY` (already provisioned Phase 4). Same monthly $5 budget — Haiku polish call is ~200 input + 100 output tokens ≈ \$0.0001 per call; cache amortizes.

**Out of scope:** rewriting bullets, projects, or skills. Streaming. Multi-turn refinement.

---

## File Structure

```
agentfolio/
├── scripts/
│   ├── llm_polish.py                    # NEW
│   ├── adapt_one.py                     # MODIFY: optional --llm flag
│   ├── adapt_all.py                     # MODIFY: pass --llm through
│   └── tests/
│       ├── test_llm_polish.py           # NEW
│       └── test_adapt_one.py            # MODIFY: assert no LLM call without flag
└── .github/workflows/
    └── adapt.yml                        # MODIFY: add --llm to scheduled run
```

---

## Task 1: `llm_polish` module + tests

**Files:**
- Create: `scripts/llm_polish.py`
- Create: `scripts/tests/test_llm_polish.py`

- [ ] **Step 1:** Write failing tests:

```python
import json
import pytest
from scripts.llm_polish import cache_key, polish_summary


def test_cache_key_is_deterministic_and_order_invariant():
    a = cache_key("hello", ["python", "rag"])
    b = cache_key("hello", ["rag", "python"])
    assert a == b
    c = cache_key("hello!", ["python", "rag"])
    assert a != c


def test_polish_summary_uses_cache_on_hit(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    key = cache_key("base summary", ["Python"])
    (cache_dir / f"{key}.txt").write_text("cached polished version")

    calls = []
    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                calls.append(kwargs)
                raise AssertionError("should not be called on cache hit")
        messages = Messages()

    out = polish_summary("base summary", ["Python"], client=FakeClient(), model="m", cache_dir=cache_dir)
    assert out == "cached polished version"
    assert calls == []


def test_polish_summary_calls_client_and_writes_cache_on_miss(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeMessage:
        def __init__(self, text):
            self.content = [type("C", (), {"text": text, "type": "text"})]

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                # temperature=0 enforced for determinism
                assert kwargs.get("temperature") == 0
                return FakeMessage("polished version")
        messages = Messages()

    out = polish_summary("base summary", ["Python"], client=FakeClient(), model="m", cache_dir=cache_dir)
    assert out == "polished version"
    key = cache_key("base summary", ["Python"])
    assert (cache_dir / f"{key}.txt").read_text() == "polished version"


def test_polish_summary_returns_input_when_client_errors(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                raise RuntimeError("api down")
        messages = Messages()

    out = polish_summary("base summary", ["Python"], client=FakeClient(), model="m", cache_dir=cache_dir)
    # graceful fallback: never block adaptation if LLM fails
    assert out == "base summary"
```

- [ ] **Step 2:** Run pytest — confirm FAIL.

- [ ] **Step 3:** Implement `scripts/llm_polish.py`:

```python
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
```

- [ ] **Step 4:** Run `python3 -m pytest scripts/tests/test_llm_polish.py -v` — expect 4 PASS.

- [ ] **Step 5:** Commit:
```
git add scripts/llm_polish.py scripts/tests/test_llm_polish.py
git commit -m "feat(adapt): add llm_polish module with caching and fail-soft"
```

---

## Task 2: Wire `--llm` into `adapt_one.py`

**Files:**
- Modify: `scripts/adapt_one.py`
- Modify: `scripts/tests/test_adapt_one.py`

- [ ] **Step 1:** Read current `scripts/adapt_one.py` and `scripts/tests/test_adapt_one.py`.

- [ ] **Step 2:** Modify `adapt()` signature to accept an optional `polish_fn=None` parameter (a callable taking `(summary, keywords) -> str`). If provided, call it after `render_summary` and use the result as `summary`.

```python
def adapt(base_resume: dict, profile: dict, polish_fn=None) -> dict:
    # ...
    summary = render_summary(base_resume, profile)
    if polish_fn is not None:
        summary = polish_fn(summary, profile.get("jd_keywords") or [])
    # ... rest unchanged
```

- [ ] **Step 3:** Add a `--llm` flag to `main()` and a `--cache-dir` flag (default `data/llm_cache/`). When `--llm` is set, build an Anthropic client and pass `polish_fn=lambda s, k: polish_summary(s, k, client=client, model="claude-haiku-4-5", cache_dir=cache_dir)` to `adapt`. When unset, pass `polish_fn=None` (default behavior, no LLM call).

```python
# in main():
parser.add_argument("--llm", action="store_true", help="Polish summary via Claude")
parser.add_argument("--cache-dir", default=None)
# ...
polish_fn = None
if args.llm:
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("warn: --llm set but ANTHROPIC_API_KEY missing; skipping polish", file=sys.stderr)
    else:
        from anthropic import Anthropic
        from scripts.llm_polish import polish_summary
        client = Anthropic(api_key=api_key)
        cache_dir = Path(args.cache_dir or root / "data" / "llm_cache")
        polish_fn = lambda s, k: polish_summary(s, k, client=client, model="claude-haiku-4-5", cache_dir=cache_dir)
adapted = adapt(base, profile, polish_fn=polish_fn)
```

- [ ] **Step 4:** Add tests to `scripts/tests/test_adapt_one.py`:

```python
def test_adapt_does_not_call_polish_when_polish_fn_none(...):
    # use existing fixture
    result = adapt(base_resume, profile)  # no polish_fn arg
    assert result["summary"] == render_summary(base_resume, profile)


def test_adapt_calls_polish_fn_when_provided(...):
    calls = []
    def fake_polish(s, k):
        calls.append((s, k))
        return "POLISHED: " + s
    result = adapt(base_resume, profile, polish_fn=fake_polish)
    assert result["summary"].startswith("POLISHED:")
    assert len(calls) == 1
```

(Adapt fixture references — read the test file to learn the existing fixture style. If fixtures use `pytest.fixture`, reuse them.)

- [ ] **Step 5:** Run `python3 -m pytest scripts/tests/test_adapt_one.py -v` — all existing pass + 2 new = green.

- [ ] **Step 6:** Run full pytest suite — expect 38 + 4 (Phase 7 module) + 2 (Phase 7 wiring) = 44.

- [ ] **Step 7:** Commit:
```
git add scripts/adapt_one.py scripts/tests/test_adapt_one.py
git commit -m "feat(adapt): add optional --llm polish to adapt_one"
```

---

## Task 3: Pass `--llm` through `adapt_all.py` + workflow

**Files:**
- Modify: `scripts/adapt_all.py`
- Modify: `.github/workflows/adapt.yml`
- Modify: `scripts/tests/test_adapt_all.py` (if it asserts argv)

- [ ] **Step 1:** Read `scripts/adapt_all.py`. Add a `--llm` argparse flag that gets forwarded into `adapt_one.main(...)` per profile.

- [ ] **Step 2:** Modify `.github/workflows/adapt.yml` to pass `--llm` in the scheduled run step. Add `ANTHROPIC_API_KEY` env. Also ensure `data/llm_cache/` is committed back so cache persists across runs.

```yaml
      - name: Adapt all
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: python -m scripts.adapt_all --llm
      - name: Commit adapted + cache
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/adapted/ data/llm_cache/
          if git diff --staged --quiet; then echo "no changes"; exit 0; fi
          git commit -m "chore(adapt): regenerate adapted resumes (--llm)"
          git push
```

- [ ] **Step 3:** Test locally without `--llm` to ensure unchanged: `python -m scripts.adapt_all` → identical output.

- [ ] **Step 4:** Commit:
```
git add scripts/adapt_all.py .github/workflows/adapt.yml scripts/tests/test_adapt_all.py
git commit -m "feat(adapt): wire --llm through adapt_all and CI"
```

---

## Task 4: Smoke test polish locally

- [ ] **Step 1:** With `ANTHROPIC_API_KEY` set in env locally:
```
python -m scripts.adapt_one cohere --llm
```
- [ ] **Step 2:** Verify `data/llm_cache/<hash>.txt` exists.
- [ ] **Step 3:** Inspect `data/adapted/cohere.json` summary — should be polished, not the raw template.
- [ ] **Step 4:** Re-run; confirm cache hit (no API call latency).

---

## Acceptance Criteria

1. `python -m pytest scripts/tests/` passes (44 tests).
2. `python -m scripts.adapt_one cohere` (no flag) produces the same summary as before this phase.
3. `python -m scripts.adapt_one cohere --llm` produces a polished summary and writes cache.
4. With `ANTHROPIC_API_KEY` unset and `--llm` passed, prints a warning and falls back to the templated summary.
5. CI `adapt.yml` scheduled run uses `--llm` and commits cache + adapted JSON.
