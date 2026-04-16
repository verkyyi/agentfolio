import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def base_resume():
    return json.loads((REPO_ROOT / "data" / "resume.json").read_text())


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
