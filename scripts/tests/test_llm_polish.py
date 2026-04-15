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
