# scripts/tests/test_llm_adapt.py
import json
import hashlib
from pathlib import Path

from scripts.llm_adapt import generate_adaptation, cache_key

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_resume():
    return json.loads((REPO_ROOT / "data" / "resume.json").read_text())


def _valid_adaptation():
    resume = _load_resume()
    exp_ids = [e["id"] for e in resume["experience"]]
    proj_ids = [p["id"] for p in resume["projects"]]
    bullet_ids = [b["id"] for e in resume["experience"] for b in e["bullets"]]
    skill_items = [item for g in resume["skills"]["groups"] for item in g["items"]]
    group_ids = [g["id"] for g in resume["skills"]["groups"]]
    return {
        "company": "Stripe",
        "generated_at": "2026-04-16T00:00:00+00:00",
        "generated_by": "llm_adapt.py v1.0",
        "summary": "A tailored summary for Stripe.",
        "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
        "experience_order": exp_ids,
        "bullet_overrides": {bullet_ids[0]: "Rewritten bullet for Stripe."},
        "project_order": proj_ids,
        "skill_emphasis": [skill_items[0], skill_items[1]],
        "match_score": {
            "overall": 0.75,
            "by_category": {gid: 0.5 for gid in group_ids},
            "matched_keywords": ["Python"],
            "missing_keywords": ["Ruby"],
        },
    }


def test_cache_key_is_deterministic():
    a = cache_key("Stripe", "FDE", {"name": "test"})
    b = cache_key("Stripe", "FDE", {"name": "test"})
    assert a == b


def test_cache_key_differs_for_different_inputs():
    a = cache_key("Stripe", "FDE", {"name": "test"})
    b = cache_key("Google", "FDE", {"name": "test"})
    assert a != b


def test_generate_adaptation_returns_cached_result(tmp_path):
    resume = _load_resume()
    expected = _valid_adaptation()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    key = cache_key("Stripe", "FDE", resume)
    (cache_dir / f"{key}.json").write_text(json.dumps(expected))

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                raise AssertionError("should not call API on cache hit")
        messages = Messages()

    result = generate_adaptation(
        "Stripe", "FDE", resume,
        client=FakeClient(), cache_dir=cache_dir,
    )
    assert result["company"] == "Stripe"
    assert result["summary"] == expected["summary"]


def test_generate_adaptation_calls_api_and_caches(tmp_path):
    resume = _load_resume()
    expected = _valid_adaptation()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeMessage:
        def __init__(self, text):
            self.content = [type("C", (), {"text": text, "type": "text"})]

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                assert kwargs.get("temperature") == 0
                return FakeMessage(json.dumps(expected))
        messages = Messages()

    result = generate_adaptation(
        "Stripe", "FDE", resume,
        client=FakeClient(), cache_dir=cache_dir,
    )
    assert result["company"] == "Stripe"
    assert "summary" in result
    assert "match_score" in result

    # Verify it was cached
    key = cache_key("Stripe", "FDE", resume)
    assert (cache_dir / f"{key}.json").exists()


def test_generate_adaptation_propagates_error(tmp_path):
    resume = _load_resume()
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                raise RuntimeError("api down")
        messages = Messages()

    try:
        generate_adaptation(
            "Stripe", "FDE", resume,
            client=FakeClient(), cache_dir=cache_dir,
        )
        assert False, "should have raised"
    except RuntimeError as e:
        assert "api down" in str(e)
