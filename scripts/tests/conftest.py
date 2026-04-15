import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def base_resume():
    return json.loads((REPO_ROOT / "data" / "resume.json").read_text())


@pytest.fixture
def cohere_profile():
    return json.loads((REPO_ROOT / "data" / "companies" / "cohere.json").read_text())


@pytest.fixture
def default_profile():
    return json.loads((REPO_ROOT / "data" / "companies" / "default.json").read_text())
