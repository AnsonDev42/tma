from types import SimpleNamespace

import pytest

from src.core.config import settings
from src.services.ocr.build_paragraph import build_paragraph
from src.services.ocr.build_paragraph import translate
from src.services.ocr.models import GroupedParagraphs, Lines


def _sample_dip_lines() -> list[dict]:
    return [
        {
            "content": "Dish Name",
            "polygon": {"x_coords": [1.0, 2.0], "y_coords": [3.0, 4.0]},
        },
        {
            "content": "Dish description",
            "polygon": {"x_coords": [5.0, 6.0], "y_coords": [7.0, 8.0]},
        },
    ]


@pytest.mark.asyncio
async def test_build_paragraph_async_parse_success(monkeypatch):
    parsed = GroupedParagraphs(Paragraphs=[Lines(segment_lines_indices=[1])])
    completion = SimpleNamespace(
        output_parsed=parsed,
        output=[SimpleNamespace(type="reasoning"), SimpleNamespace(type="message")],
        output_text='{"Paragraphs":[{"segment_lines_indices":[1]}]}',
        status="completed",
    )
    captured_parse_kwargs = {}

    class FakeAsyncOpenAI:
        def __init__(self, *args, **kwargs):
            async def _parse(**_kwargs):
                captured_parse_kwargs.update(_kwargs)
                return completion

            self.responses = SimpleNamespace(parse=_parse)

    monkeypatch.setattr(
        "src.services.ocr.build_paragraph.should_invoke_llm_grouping",
        lambda *_args, **_kwargs: True,
    )
    monkeypatch.setattr(
        settings,
        "MENU_GROUPING_LLM_REASONING_EFFORT",
        "minimal",
        raising=False,
    )
    monkeypatch.setattr("src.services.ocr.build_paragraph.AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr("src.services.ocr.build_paragraph._openai_client", None)

    paragraph_lines, individual_lines = await build_paragraph(_sample_dip_lines())

    assert len(paragraph_lines) == 1
    assert paragraph_lines[0]["content"] == "Dish description"
    assert len(individual_lines) == 1
    assert individual_lines[0]["content"] == "Dish Name"
    assert captured_parse_kwargs["reasoning"] == {"effort": "minimal"}


@pytest.mark.asyncio
async def test_build_paragraph_timeout_falls_back_to_lines_only(monkeypatch):
    async def fake_group_with_llm(_features):
        raise TimeoutError()

    monkeypatch.setattr(
        "src.services.ocr.build_paragraph.should_invoke_llm_grouping",
        lambda *_args, **_kwargs: True,
    )
    monkeypatch.setattr("src.services.ocr.build_paragraph._group_with_llm", fake_group_with_llm)

    dip_lines = _sample_dip_lines()
    paragraph_lines, individual_lines = await build_paragraph(dip_lines)

    assert paragraph_lines == []
    assert len(individual_lines) == len(dip_lines)


@pytest.mark.asyncio
async def test_build_paragraph_parse_fallback_to_lines_only(monkeypatch):
    async def fake_group_with_llm(_features):
        return None

    monkeypatch.setattr(
        "src.services.ocr.build_paragraph.should_invoke_llm_grouping",
        lambda *_args, **_kwargs: True,
    )
    monkeypatch.setattr("src.services.ocr.build_paragraph._group_with_llm", fake_group_with_llm)

    dip_lines = _sample_dip_lines()
    paragraph_lines, individual_lines = await build_paragraph(dip_lines)

    assert paragraph_lines == []
    assert len(individual_lines) == len(dip_lines)


@pytest.mark.asyncio
async def test_translate_adds_global_reasoning_effort(monkeypatch):
    captured_create_kwargs = {}

    class FakeAsyncOpenAI:
        def __init__(self, *args, **kwargs):
            async def _create(**_kwargs):
                captured_create_kwargs.update(_kwargs)
                return SimpleNamespace(output_text="hola")

            self.responses = SimpleNamespace(create=_create)

    monkeypatch.setattr(
        settings,
        "OPENAI_REASONING_EFFORT",
        "minimal",
        raising=False,
    )
    monkeypatch.setattr("src.services.ocr.build_paragraph.AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr("src.services.ocr.build_paragraph._openai_client", None)

    translated = await translate("hello", "es")

    assert translated == "hola"
    assert captured_create_kwargs["reasoning"] == {"effort": "minimal"}


@pytest.mark.asyncio
async def test_translate_skips_reasoning_when_disabled(monkeypatch):
    captured_create_kwargs = {}

    class FakeAsyncOpenAI:
        def __init__(self, *args, **kwargs):
            async def _create(**_kwargs):
                captured_create_kwargs.update(_kwargs)
                return SimpleNamespace(output_text="hola")

            self.responses = SimpleNamespace(create=_create)

    monkeypatch.setattr(settings, "OPENAI_REASONING_EFFORT", "none", raising=False)
    monkeypatch.setattr("src.services.ocr.build_paragraph.AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr("src.services.ocr.build_paragraph._openai_client", None)

    await translate("hello", "es")

    assert "reasoning" not in captured_create_kwargs
