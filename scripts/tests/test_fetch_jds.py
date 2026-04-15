import json
from datetime import date

import pytest
from scripts.fetch_jds import extract_keywords, detect_platform, merge_profile, KEYWORD_VOCAB


def test_detect_platform_ashby():
    assert detect_platform("https://jobs.ashbyhq.com/cohere/abc") == "ashby"


def test_detect_platform_greenhouse():
    assert detect_platform("https://boards.greenhouse.io/openai/jobs/123") == "greenhouse"


def test_detect_platform_lever():
    assert detect_platform("https://jobs.lever.co/anthropic/abc") == "lever"


def test_detect_platform_generic():
    assert detect_platform("https://example.com/jobs/123") == "generic"


def test_extract_keywords_picks_known_vocab():
    text = "We are hiring a Python engineer with experience in RAG, agents, and AWS."
    kws = extract_keywords(text)
    assert "Python" in kws
    assert "RAG" in kws
    assert "agents" in kws
    assert "AWS" in kws


def test_extract_keywords_dedupes_case_insensitive():
    text = "python python PYTHON Python"
    kws = extract_keywords(text)
    assert kws.count("Python") == 1


def test_extract_keywords_empty_when_no_match():
    assert extract_keywords("blah blah unrelated text") == []


def test_keyword_vocab_includes_core_terms():
    # Sanity: vocab covers the keywords used by existing profiles
    assert "Python" in KEYWORD_VOCAB
    assert "RAG" in KEYWORD_VOCAB
    assert "agents" in KEYWORD_VOCAB


def test_merge_profile_overwrites_keywords_on_success():
    profile = {"company": "X", "jd_url": "https://x", "jd_keywords": ["old"], "jd_fetched": "2026-01-01"}
    out = merge_profile(profile, ["Python", "RAG"], stale=False)
    assert out["jd_keywords"] == ["Python", "RAG"]
    assert out["stale"] is False
    assert out["jd_fetched"] != "2026-01-01"


def test_merge_profile_keeps_keywords_when_stale():
    profile = {"company": "X", "jd_keywords": ["Python"], "jd_fetched": "2026-01-01"}
    out = merge_profile(profile, [], stale=True)
    assert out["jd_keywords"] == ["Python"]   # untouched
    assert out["stale"] is True
    assert out["jd_fetched"] == "2026-01-01"   # untouched


def test_process_one_writes_back_on_change(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    p.write_text(json.dumps({"company": "X", "jd_url": "https://x", "jd_keywords": []}))
    fake = lambda url, timeout=15.0: (200, "We need Python and RAG.")
    slug, changed = _process_one(p, fetch=fake)
    assert changed is True
    updated = json.loads(p.read_text())
    assert "Python" in updated["jd_keywords"]
    assert "RAG" in updated["jd_keywords"]


def test_process_one_marks_stale_on_404(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    p.write_text(json.dumps({"company": "X", "jd_url": "https://x", "jd_keywords": ["LLM"]}))
    fake = lambda url, timeout=15.0: (404, "")
    _process_one(p, fetch=fake)
    updated = json.loads(p.read_text())
    assert updated["stale"] is True
    assert updated["jd_keywords"] == ["LLM"]   # preserved


def test_process_one_no_change_returns_false(tmp_path):
    from scripts.fetch_jds import _process_one
    p = tmp_path / "x.json"
    initial = {"company": "X", "jd_url": "https://x", "jd_keywords": ["Python"], "jd_fetched": date.today().isoformat(), "stale": False}
    p.write_text(json.dumps(initial))
    fake = lambda url, timeout=15.0: (200, "Python only.")
    slug, changed = _process_one(p, fetch=fake)
    assert changed is False
