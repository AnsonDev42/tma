from src.core.config import settings
from src.services.utils import build_chat_openai, build_openai_reasoning_kwargs


def test_build_chat_openai_injects_global_reasoning_effort(monkeypatch):
    captured_init_kwargs = {}

    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            captured_init_kwargs.update(kwargs)

    monkeypatch.setattr(settings, "OPENAI_REASONING_EFFORT", "minimal", raising=False)
    monkeypatch.setattr("src.services.utils.ChatOpenAI", FakeChatOpenAI)

    build_chat_openai()

    assert captured_init_kwargs["reasoning_effort"] == "minimal"


def test_build_chat_openai_skips_reasoning_when_disabled(monkeypatch):
    captured_init_kwargs = {}

    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            captured_init_kwargs.update(kwargs)

    monkeypatch.setattr(settings, "OPENAI_REASONING_EFFORT", "none", raising=False)
    monkeypatch.setattr("src.services.utils.ChatOpenAI", FakeChatOpenAI)

    build_chat_openai()

    assert "reasoning_effort" not in captured_init_kwargs


def test_build_chat_openai_includes_temperature_when_provided(monkeypatch):
    captured_init_kwargs = {}

    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            captured_init_kwargs.update(kwargs)

    monkeypatch.setattr("src.services.utils.ChatOpenAI", FakeChatOpenAI)

    build_chat_openai(temperature=0)

    assert captured_init_kwargs["temperature"] == 0


def test_build_openai_reasoning_kwargs_uses_override_without_fallback():
    assert build_openai_reasoning_kwargs("") == {}
