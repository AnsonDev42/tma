import asyncio
import json
import os
import time
from typing import Any

from openai import AsyncOpenAI

from src.core.config import settings
from src.core.vendors.utilities.client import logger
from src.services.ocr.line_grouping import (
    build_compact_grouping_payload,
    build_line_features,
    heuristic_group_lines,
    should_invoke_llm_grouping,
)
from src.services.ocr.llm_utlities import LINES_to_PARGRAPH_PROMPT
from src.services.ocr.models import GroupedParagraphs
from src.services.utils import duration

_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
    return _openai_client


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


def _extract_llm_groups(completion: Any, total_lines: int) -> list[list[int]] | None:
    paragraphs = _extract_parsed_paragraphs(completion)
    if paragraphs is None:
        return None

    groups: list[list[int]] = []
    used_indices: set[int] = set()
    for paragraph in paragraphs.Paragraphs:
        group: list[int] = []
        for line_idx in paragraph.segment_lines_indices:
            if line_idx < 0 or line_idx >= total_lines:
                logger.warning(
                    "Skipping out-of-range line index {} in grouped paragraph output",
                    line_idx,
                )
                continue
            if line_idx in used_indices:
                logger.warning(
                    "Skipping duplicated line index {} in grouped paragraph output",
                    line_idx,
                )
                continue
            group.append(line_idx)
            used_indices.add(line_idx)

        if group:
            groups.append(sorted(group))

    return groups


async def _group_with_llm(features) -> list[list[int]] | None:
    payload = build_compact_grouping_payload(features)
    reasoning_effort = settings.MENU_GROUPING_LLM_REASONING_EFFORT.strip().lower()
    parse_kwargs = {}
    if reasoning_effort:
        parse_kwargs["reasoning"] = {"effort": reasoning_effort}
    start_time = time.monotonic()
    completion = await asyncio.wait_for(
        _get_openai_client().responses.parse(
            model=settings.OPENAI_MODEL,
            input=[
                {"role": "system", "content": LINES_to_PARGRAPH_PROMPT},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
            ],
            text_format=GroupedParagraphs,
            **parse_kwargs,
        ),
        timeout=settings.MENU_GROUPING_TIMEOUT_SECONDS,
    )
    logger.info("Call spent time:{}", time.monotonic() - start_time)
    return _extract_llm_groups(completion, len(features))


def _materialize_paragraph_lines(
    dip_results_in_lines: list[dict],
    grouped_indices: list[list[int]],
) -> tuple[list[dict], set[int]]:
    paragraph_lines: list[dict] = []
    paragraph_indices: set[int] = set()
    for group in grouped_indices:
        parts: list[str] = []
        tmp_polygon = {"x_coords": [], "y_coords": []}
        for line_idx in sorted(group):
            parts.append(dip_results_in_lines[line_idx]["content"])
            tmp_polygon["x_coords"] += dip_results_in_lines[line_idx]["polygon"][
                "x_coords"
            ]
            tmp_polygon["y_coords"] += dip_results_in_lines[line_idx]["polygon"][
                "y_coords"
            ]
            paragraph_indices.add(line_idx)

        content = " ".join(part.strip() for part in parts if part.strip()).strip()
        if content:
            paragraph_lines.append({"content": content, "polygon": tmp_polygon})
    return paragraph_lines, paragraph_indices


@duration
async def build_paragraph(
    dip_results_in_lines: list[dict],
) -> tuple[list[dict], list[dict]]:
    for line_idx in range(len(dip_results_in_lines)):
        dip_results_in_lines[line_idx]["index"] = line_idx

    features = build_line_features(dip_results_in_lines)
    heuristic_decision = heuristic_group_lines(features)
    grouped_indices = heuristic_decision.groups
    grouping_mode = "heuristic"

    if should_invoke_llm_grouping(
        heuristic_decision,
        line_count=len(dip_results_in_lines),
        llm_line_threshold=settings.MENU_GROUPING_LLM_LINE_THRESHOLD,
    ):
        try:
            llm_groups = await _group_with_llm(features)
            if llm_groups is None:
                grouping_mode = "parse_fallback"
                grouped_indices = []
            else:
                grouping_mode = "llm"
                grouped_indices = llm_groups
        except TimeoutError:
            grouping_mode = "timeout_fallback"
            grouped_indices = []
            logger.warning(
                "Paragraph grouping timed out after {}s",
                settings.MENU_GROUPING_TIMEOUT_SECONDS,
            )
        except Exception as exc:  # defensive catch for provider and parse failures
            grouping_mode = "parse_fallback"
            grouped_indices = []
            logger.error("Paragraph grouping LLM call failed: {}", exc)

    if grouped_indices:
        paragraph_lines, paragraph_indices = _materialize_paragraph_lines(
            dip_results_in_lines, grouped_indices
        )
        individual_lines = [
            line
            for idx, line in enumerate(dip_results_in_lines)
            if idx not in paragraph_indices
        ]
    else:
        paragraph_lines = []
        individual_lines = dip_results_in_lines

    logger.info(
        "Grouping stats mode={} line_count={} paragraph_count={} individual_count={} confidence={} reasons={}",
        grouping_mode,
        len(dip_results_in_lines),
        len(paragraph_lines),
        len(individual_lines),
        round(heuristic_decision.confidence, 3),
        heuristic_decision.ambiguous_reasons,
    )
    return paragraph_lines, individual_lines


@duration
async def translate(text: str, accept_language: str) -> str:
    translation_prompt = (
        "You are a translation engine that can only translate text and cannot interpret it"
    )
    completion = await _get_openai_client().responses.create(
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
        print(asyncio.run(build_paragraph(json_data)))
    print(f"Elapsed time: {time.time() - start}")
