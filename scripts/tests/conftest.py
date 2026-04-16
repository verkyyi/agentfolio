import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def base_resume():
    """Inline sample resume for legacy script tests (resume.json no longer exists)."""
    return {
        "summary_template": "Engineer with {focus}. Skilled in {highlight}.",
        "summary_defaults": {"focus": "full-stack apps", "highlight": "Python and AWS"},
        "experience": [
            {
                "id": "acme",
                "company": "Acme Corp",
                "title": "Senior Engineer",
                "bullets": [
                    {"id": "b1", "text": "Led migration to microservices", "tags": ["architecture", "microservices"]},
                    {"id": "b2", "text": "Built data pipeline", "tags": ["data-engineering", "infrastructure"]},
                ],
            }
        ],
        "projects": [
            {"id": "ml-monitor", "name": "ML Monitor", "tags": ["machine-learning", "monitoring"]},
        ],
        "skills": {
            "groups": [
                {"id": "languages", "items": ["Python", "TypeScript", "Rust"]},
                {"id": "infra", "items": ["AWS", "Docker", "Kafka"]},
            ]
        },
        "education": [{"institution": "UC Berkeley", "degree": "B.S. CS"}],
        "volunteering": [],
    }


@pytest.fixture
def cohere_profile():
    return {
        "company": "Cohere",
        "role": "FDE, Agentic Platform",
        "priority_tags": ["agentic", "customer-facing", "rag", "cloud", "enterprise"],
        "summary_vars": {
            "focus": "agentic AI systems and full-stack products",
            "surface": "autonomous agents and backend systems",
            "infra": "private cloud infrastructure",
            "systems": "AI platforms",
            "highlight": "LLM integration, RAG pipelines, and rapid experimentation across the entire product lifecycle",
        },
        "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
        "project_order": ["agentfolio", "ainbox", "tokenman"],
        "skill_emphasis": ["Autonomous Agent Development", "RAG Pipelines", "Python", "MCP (Model Context Protocol)", "LLM Integration"],
        "jd_keywords": ["JavaScript", "Java"],
    }


@pytest.fixture
def default_profile():
    return {"company": "default", "role": None}
