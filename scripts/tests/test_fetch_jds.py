import pytest
from scripts.fetch_jds import extract_keywords, detect_platform, KEYWORD_VOCAB


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
