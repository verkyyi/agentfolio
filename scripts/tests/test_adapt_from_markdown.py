"""Tests for adapt_from_markdown — the markdown-to-adapted-JSON pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scripts.adapt_from_markdown import (
    adapt_one_from_markdown,
    adapt_all_from_markdown,
    generate_slugs_json,
    build_adaptation_prompt,
    build_default_prompt,
    parse_llm_response,
)


SAMPLE_RESUME_MD = """\
# Alex Chen
Software Engineer | San Francisco, CA
alex@example.com | github.com/alexchen

## Experience

### Senior Software Engineer — Acme Corp (2022–present)
- Led migration to microservices, reducing p99 latency by 40%
- Built real-time data pipeline processing 2M events/day

### Full-Stack Engineer — DataFlow Startup (2020–2022)
- Shipped analytics dashboard used by 500+ enterprise customers

## Skills
Python, TypeScript, Rust, AWS, Kafka, Docker
"""

SAMPLE_JD_MD = """\
# Data Platform Engineer — TechCo

We're looking for a Data Platform Engineer to build and scale our
real-time data infrastructure. You'll work with Kafka, Flink, and AWS.

Requirements:
- 3+ years with streaming data systems
- Experience with Python and distributed systems
- AWS infrastructure experience
"""

SAMPLE_LLM_RESPONSE = json.dumps({
    "basics": {
        "name": "Alex Chen",
        "label": "Software Engineer",
        "email": "alex@example.com",
        "summary": "Data platform engineer with 4+ years...",
        "location": {"city": "San Francisco", "region": "CA"},
        "profiles": [],
    },
    "work": [
        {
            "name": "Acme Corp",
            "position": "Senior Software Engineer",
            "startDate": "2022-06",
            "highlights": ["Built real-time data pipeline"],
        }
    ],
    "projects": [],
    "skills": [{"name": "Languages", "keywords": ["Python", "TypeScript"]}],
    "education": [],
    "volunteer": [],
    "meta": {
        "version": "1.0.0",
        "lastModified": "2026-01-01T00:00:00+00:00",
        "agentfolio": {
            "company": "TechCo",
            "role": "Data Platform Engineer",
            "generated_by": "adapt_from_markdown.py v1.0",
            "match_score": {
                "overall": 0.85,
                "by_category": {"languages": 0.7},
                "matched_keywords": ["Python", "Kafka"],
                "missing_keywords": ["Flink"],
            },
            "skill_emphasis": ["Kafka", "AWS"],
            "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
        },
    },
})


def _mock_client(response_text: str) -> MagicMock:
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = response_text
    msg = MagicMock()
    msg.content = [block]
    client.messages.create.return_value = msg
    return client


class TestBuildAdaptationPrompt:
    def test_includes_resume_and_jd(self):
        system, user = build_adaptation_prompt(SAMPLE_RESUME_MD, SAMPLE_JD_MD)
        assert "resume" in system.lower() or "resume" in user.lower()
        assert "Alex Chen" in user
        assert "TechCo" in user or "Data Platform" in user

    def test_system_prompt_requests_json(self):
        system, _ = build_adaptation_prompt(SAMPLE_RESUME_MD, SAMPLE_JD_MD)
        assert "JSON" in system


class TestBuildDefaultPrompt:
    def test_includes_resume_only(self):
        system, user = build_default_prompt(SAMPLE_RESUME_MD)
        assert "Alex Chen" in user
        assert "JSON" in system


class TestParseLlmResponse:
    def test_parses_valid_json(self):
        result = parse_llm_response(SAMPLE_LLM_RESPONSE)
        assert result["basics"]["name"] == "Alex Chen"
        assert result["meta"]["agentfolio"]["company"] == "TechCo"

    def test_strips_markdown_fences(self):
        wrapped = f"```json\n{SAMPLE_LLM_RESPONSE}\n```"
        result = parse_llm_response(wrapped)
        assert result["basics"]["name"] == "Alex Chen"

    def test_raises_on_invalid_json(self):
        with pytest.raises(ValueError):
            parse_llm_response("not json at all")


class TestAdaptOneFromMarkdown:
    def test_calls_llm_and_returns_adapted(self):
        client = _mock_client(SAMPLE_LLM_RESPONSE)
        result = adapt_one_from_markdown(
            resume_md=SAMPLE_RESUME_MD,
            jd_md=SAMPLE_JD_MD,
            client=client,
        )
        assert result["basics"]["name"] == "Alex Chen"
        assert client.messages.create.call_count == 1

    def test_default_adaptation_without_jd(self):
        client = _mock_client(SAMPLE_LLM_RESPONSE)
        result = adapt_one_from_markdown(
            resume_md=SAMPLE_RESUME_MD,
            jd_md=None,
            client=client,
        )
        assert result["basics"]["name"] == "Alex Chen"


class TestGenerateSlugsJson:
    def test_generates_from_adapted_meta(self):
        adapted = {
            "techco": {
                "meta": {
                    "agentfolio": {
                        "company": "TechCo",
                        "role": "Data Platform Engineer",
                    }
                }
            }
        }
        slugs = generate_slugs_json(adapted)
        assert "techco" in slugs
        assert slugs["techco"]["company"] == "TechCo"
        assert slugs["techco"]["role"] == "Data Platform Engineer"


class TestAdaptAllFromMarkdown:
    def test_processes_all_jds_and_default(self, tmp_path):
        # Set up data dir
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "resume.md").write_text(SAMPLE_RESUME_MD)
        jd_dir = data_dir / "jd"
        jd_dir.mkdir()
        (jd_dir / "techco.md").write_text(SAMPLE_JD_MD)

        client = _mock_client(SAMPLE_LLM_RESPONSE)
        results = adapt_all_from_markdown(data_dir, client=client)

        # One JD + one default = 2 calls
        assert client.messages.create.call_count == 2
        assert "techco" in results
        assert "default" in results
