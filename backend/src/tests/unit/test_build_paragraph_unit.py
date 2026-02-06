from types import SimpleNamespace

from src.services.ocr.build_paragraph import build_paragraph
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


def test_build_paragraph_handles_reasoning_first_output(monkeypatch):
    parsed = GroupedParagraphs(Paragraphs=[Lines(segment_lines_indices=[1])])
    completion = SimpleNamespace(
        output_parsed=parsed,
        output=[SimpleNamespace(type="reasoning"), SimpleNamespace(type="message")],
        output_text='{"Paragraphs":[{"segment_lines_indices":[1]}]}',
        status="completed",
    )

    class FakeOpenAI:
        def __init__(self, *args, **kwargs):
            self.responses = SimpleNamespace(parse=lambda **_kwargs: completion)

    monkeypatch.setattr("src.services.ocr.build_paragraph.OpenAI", FakeOpenAI)

    paragraph_lines, individual_lines = build_paragraph(_sample_dip_lines())

    assert len(paragraph_lines) == 1
    assert paragraph_lines[0]["content"] == "Dish description"
    assert len(individual_lines) == 1
    assert individual_lines[0]["content"] == "Dish Name"


def test_build_paragraph_falls_back_when_no_structured_output(monkeypatch):
    completion = SimpleNamespace(
        output_parsed=None,
        output=[SimpleNamespace(type="reasoning")],
        output_text="",
        status="completed",
    )

    class FakeOpenAI:
        def __init__(self, *args, **kwargs):
            self.responses = SimpleNamespace(parse=lambda **_kwargs: completion)

    monkeypatch.setattr("src.services.ocr.build_paragraph.OpenAI", FakeOpenAI)

    dip_lines = _sample_dip_lines()
    paragraph_lines, individual_lines = build_paragraph(dip_lines)

    assert paragraph_lines == []
    assert len(individual_lines) == len(dip_lines)
