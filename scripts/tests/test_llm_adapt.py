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
    return {
        "basics": {
            "name": resume["basics"]["name"],
            "label": resume["basics"].get("label", ""),
            "email": resume["basics"]["email"],
            "phone": resume["basics"].get("phone", ""),
            "summary": "A tailored summary for Stripe.",
            "location": resume["basics"]["location"],
            "profiles": resume["basics"]["profiles"],
        },
        "work": [
            {
                "name": w["name"],
                "position": w["position"],
                "location": w.get("location", ""),
                "startDate": w["startDate"],
                "highlights": w["highlights"],
            }
            for w in resume["work"]
        ],
        "projects": [
            {
                "name": p["name"],
                "description": p.get("description", ""),
                "url": p.get("url", ""),
                "startDate": p.get("startDate", ""),
                "highlights": p.get("highlights", []),
                "keywords": p.get("keywords", []),
            }
            for p in resume["projects"]
        ],
        "skills": [
            {"name": s["name"], "keywords": s["keywords"]}
            for s in resume["skills"]
        ],
        "education": [
            {k: v for k, v in e.items()} for e in resume.get("education", [])
        ],
        "volunteer": [
            {k: v for k, v in v.items()} for v in resume.get("volunteer", [])
        ],
        "meta": {
            "version": "1.0.0",
            "lastModified": "2026-04-16T00:00:00+00:00",
            "agentfolio": {
                "company": "Stripe",
                "generated_by": "llm_adapt.py v2.0",
                "match_score": {
                    "overall": 0.75,
                    "by_category": {s["id"]: 0.5 for s in resume["skills"]},
                    "matched_keywords": ["Python"],
                    "missing_keywords": ["Ruby"],
                },
                "skill_emphasis": [resume["skills"][0]["keywords"][0]],
                "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
            },
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
    assert result["meta"]["agentfolio"]["company"] == "Stripe"
    assert result["basics"]["summary"] == expected["basics"]["summary"]


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
    assert result["meta"]["agentfolio"]["company"] == "Stripe"
    assert "summary" in result["basics"]
    assert "match_score" in result["meta"]["agentfolio"]

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
