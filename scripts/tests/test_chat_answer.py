import pytest
from scripts.chat_answer import build_system_prompt, answer


def test_build_system_prompt_includes_resume_json():
    resume = {"name": "X", "summary_template": "hi"}
    prompt = build_system_prompt(resume)
    assert "X" in prompt
    assert "hi" in prompt
    assert "resume" in prompt.lower()


def test_answer_calls_client_with_expected_shape():
    calls = []

    class FakeMessage:
        def __init__(self, text):
            self.content = [type("C", (), {"text": text, "type": "text"})]

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                calls.append(kwargs)
                return FakeMessage("He has 5 years of Python experience.")
        messages = Messages()

    result = answer(
        question="How many years of Python?",
        resume={"name": "X"},
        client=FakeClient(),
        model="claude-haiku-4-5",
    )
    assert result == "He has 5 years of Python experience."
    assert calls[0]["model"] == "claude-haiku-4-5"
    assert calls[0]["max_tokens"] > 0
    assert any("How many years" in m["content"] for m in calls[0]["messages"])


def test_answer_truncates_long_questions():
    class FakeMessage:
        def __init__(self):
            self.content = [type("C", (), {"text": "ok", "type": "text"})]

    seen = []

    class FakeClient:
        class Messages:
            def create(self, **kwargs):
                seen.append(kwargs["messages"][0]["content"])
                return FakeMessage()
        messages = Messages()

    long_q = "x" * 5000
    answer(question=long_q, resume={}, client=FakeClient(), model="m")
    assert len(seen[0]) <= 2000
