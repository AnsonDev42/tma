import json
import os
import time
from typing import Any

from openai import OpenAI

from src.core.config import settings
from src.core.vendors.utilities.client import logger
from src.services.ocr.llm_utlities import LINES_to_PARGRAPH_PROMPT
from src.services.ocr.models import GroupedParagraphs
from src.services.utils import duration


def _extract_parsed_paragraphs(completion: Any) -> GroupedParagraphs | None:
    paragraphs = getattr(completion, "output_parsed", None)
    if paragraphs is not None:
        return paragraphs

    output_items = getattr(completion, "output", [])
    output_types = [getattr(item, "type", "unknown") for item in output_items]
    logger.error(
        "Paragraph parse returned no structured output; status={}, output_types={}, output_text={}",
        getattr(completion, "status", "unknown"),
        output_types,
        getattr(completion, "output_text", ""),
    )
    return None


@duration
def build_paragraph(dip_results_in_lines):
    all_lines = []
    for line_idx in range(len(dip_results_in_lines)):
        dip_results_in_lines[line_idx]["index"] = line_idx
        all_lines.append((line_idx, dip_results_in_lines[line_idx]["content"]))

    client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
    start_time = time.time()
    completion = client.responses.parse(
        model=settings.OPENAI_MODEL,
        input=[
            {"role": "system", "content": LINES_to_PARGRAPH_PROMPT},
            {"role": "user", "content": str(all_lines)},
        ],
        text_format=GroupedParagraphs,
    )
    logger.info("Call spent time:{}", time.time() - start_time)
    paragraphs = _extract_parsed_paragraphs(completion)
    if paragraphs is None:
        # Degrade gracefully: no grouped paragraphs, keep all lines as individual.
        return [], dip_results_in_lines

    # get paragraph content and polygons
    paragraph_lines = []
    paragraph_indices: set[int] = set()
    for paragraph in paragraphs.Paragraphs:
        complete_p = ""
        tmp_polygon = {"x_coords": [], "y_coords": []}
        for line_idx in paragraph.segment_lines_indices:
            if line_idx < 0 or line_idx >= len(dip_results_in_lines):
                logger.warning(
                    "Skipping out-of-range line index {} in grouped paragraph output",
                    line_idx,
                )
                continue

            complete_p += dip_results_in_lines[line_idx]["content"]
            tmp_polygon["x_coords"] += dip_results_in_lines[line_idx]["polygon"][
                "x_coords"
            ]
            tmp_polygon["y_coords"] += dip_results_in_lines[line_idx]["polygon"][
                "y_coords"
            ]
            paragraph_indices.add(line_idx)

        if not complete_p:
            continue

        paragraph_lines.append({"content": complete_p, "polygon": tmp_polygon})

    # reduce json_data by removing the lines that are part of the paragraph content
    individual_dip_results_in_lines = []
    for i, line in enumerate(dip_results_in_lines):
        if i not in paragraph_indices:
            individual_dip_results_in_lines.append(line)

    return paragraph_lines, individual_dip_results_in_lines


def translate(text: str, accept_language: str) -> str:
    client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
    translation_prompt = "You are a translation engine that can only translate text and cannot interpret it"
    completion = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=[
            {"role": "system", "content": translation_prompt},
            {"role": "user", "content": f"translate to {accept_language}:{text}"},
        ],
    )
    return completion.output_text


if __name__ == "__main__":
    start = time.time()
    abs_path = os.path.abspath(__file__)
    abs_json_path = os.path.join(
        os.path.dirname(abs_path), "dpi_layout_compressed_shorten.jpg.json"
    )
    with open(abs_json_path) as f:
        json_data = json.load(f)["analyzeResult"]["pages"][0]["lines"]
        print(build_paragraph(json_data))
    print(f"Elapsed time: {time.time() - start}")
