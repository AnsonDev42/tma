import asyncio
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Literal

from openai import AsyncOpenAI

from src.core.config import settings
from src.core.vendors.utilities.client import logger
from src.services.ocr.llm_utlities import (
    SEGMENTS_WASH_PROMPT,
    SEGMENTS_to_PARGRAPH_PROMPT,
)
from src.services.ocr.models import GroupedSegments, WashedSegments
from src.services.utils import build_openai_reasoning_kwargs, duration

SegmentRole = Literal["title", "description", "price", "unknown"]
LayoutWashLabel = Literal["dish_title", "description", "price", "non_dish", "unknown"]
_PRICE_NUMBER_PATTERN = r"(?:\d{1,3}(?:[.,]\d{3})+|\d{1,4})(?:[.,]\d{1,2})?"
_TRAILING_PRICE_PATTERN = re.compile(
    rf"[-–—:]\s*(?:[$€£¥]\s*)?{_PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?\s*$",
    re.IGNORECASE,
)
_TRAILING_PRICE_WITH_SPACE_PATTERN = re.compile(
    rf"\s+((?:[$€£¥]\s*)?{_PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?)\s*$",
    re.IGNORECASE,
)
_PRICE_ONLY_PATTERN = re.compile(
    rf"^(?:[$€£¥]\s*)?{_PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?$",
    re.IGNORECASE,
)
_PRICE_TOKEN_PATTERN = re.compile(
    rf"(?:[$€£¥]\s*)?{_PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?",
    re.IGNORECASE,
)
_SEGMENT_DELIMITER_PATTERN = re.compile(r"\s*(?:\||•|·|;|；|\u2022)\s*")

_openai_client: AsyncOpenAI | None = None


@dataclass(frozen=True, slots=True)
class SegmentCandidate:
    index: int
    source_line_index: int
    segment_order: int
    text: str
    role_hint: SegmentRole
    polygon: dict[str, list[float]]
    bbox: dict[str, float]


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
    return _openai_client


def _resolve_layout_grouping_model() -> str:
    preferred_model = settings.MENU_LAYOUT_GROUPING_LLM_MODEL.strip()
    return preferred_model or settings.OPENAI_MODEL


def _trim_text_range(text: str, start: int, end: int) -> tuple[int, int] | None:
    left = start
    right = end
    while left < right and text[left].isspace():
        left += 1
    while right > left and text[right - 1].isspace():
        right -= 1
    if left >= right:
        return None
    return left, right


def _trim_price_range(text: str, start: int, end: int) -> tuple[int, int] | None:
    trimmed = _trim_text_range(text, start, end)
    if trimmed is None:
        return None

    left, right = trimmed
    while left < right and text[left] in {"-", "–", "—", ":"}:
        left += 1
    return _trim_text_range(text, left, right)


def _split_with_delimiters(text: str, start: int, end: int) -> list[tuple[int, int]]:
    if start >= end:
        return []

    ranges: list[tuple[int, int]] = []
    cursor = start
    for match in _SEGMENT_DELIMITER_PATTERN.finditer(text, start, end):
        candidate = _trim_text_range(text, cursor, match.start())
        if candidate is not None:
            ranges.append(candidate)
        cursor = match.end()

    tail = _trim_text_range(text, cursor, end)
    if tail is not None:
        ranges.append(tail)
    return ranges


def _split_out_trailing_price(text: str, start: int, end: int) -> list[tuple[int, int]]:
    chunk = text[start:end]
    price_start: int | None = None
    strict_match = _TRAILING_PRICE_PATTERN.search(chunk)
    if strict_match is not None:
        price_start = start + strict_match.start()
    else:
        loose_match = _TRAILING_PRICE_WITH_SPACE_PATTERN.search(chunk)
        if loose_match is not None:
            price_start = start + loose_match.start(1)
    if price_start is None:
        return [(start, end)]

    pieces: list[tuple[int, int]] = []
    left_piece = _trim_text_range(text, start, price_start)
    if left_piece is not None:
        pieces.append(left_piece)
    price_piece = _trim_price_range(text, price_start, end)
    if price_piece is not None:
        pieces.append(price_piece)

    return pieces or [(start, end)]


def _split_by_repeated_prices(text: str, start: int, end: int) -> list[tuple[int, int]]:
    chunk = text[start:end]
    matches = list(_PRICE_TOKEN_PATTERN.finditer(chunk))
    if len(matches) < 2:
        return [(start, end)]

    ranges: list[tuple[int, int]] = []
    cursor = start
    for match in matches:
        price_end = start + match.end()
        candidate = _trim_text_range(text, cursor, price_end)
        if candidate is not None:
            ranges.append(candidate)
        cursor = price_end

    tail = _trim_text_range(text, cursor, end)
    if tail is not None:
        ranges.append(tail)

    return ranges if len(ranges) >= 2 else [(start, end)]


def _classify_segment(text: str) -> SegmentRole:
    stripped = text.strip()
    if not stripped:
        return "unknown"

    if _PRICE_ONLY_PATTERN.fullmatch(stripped):
        return "price"

    words = [part for part in stripped.split() if part]
    word_count = len(words)
    if word_count >= 7 or len(stripped) >= 42:
        return "description"

    if any(token in stripped for token in (",", ";", "，", "；", "、", "。")):
        return "description"

    if word_count <= 5 and len(stripped) <= 42:
        return "title"

    return "unknown"


def _segment_polygon_from_char_range(
    line_polygon: dict[str, list[float]],
    text_len: int,
    start: int,
    end: int,
) -> dict[str, list[float]]:
    raw_x = [float(value) for value in line_polygon["x_coords"]]
    raw_y = [float(value) for value in line_polygon["y_coords"]]
    x_min = min(raw_x)
    x_max = max(raw_x)
    y_min = min(raw_y)
    y_max = max(raw_y)

    if text_len <= 0 or x_max <= x_min:
        seg_x_min = x_min
        seg_x_max = x_max
    else:
        width = x_max - x_min
        seg_x_min = x_min + width * (start / text_len)
        seg_x_max = x_min + width * (end / text_len)
        if seg_x_max <= seg_x_min:
            seg_x_max = seg_x_min + max(1.0, width * 0.02)

    return {
        "x_coords": [seg_x_min, seg_x_max, seg_x_max, seg_x_min],
        "y_coords": [y_min, y_min, y_max, y_max],
    }


def build_layout_segments(dip_results_in_lines: list[dict]) -> list[SegmentCandidate]:
    if not dip_results_in_lines:
        return []

    max_x = 1.0
    max_y = 1.0
    for line in dip_results_in_lines:
        polygon = line["polygon"]
        max_x = max(max_x, float(max(polygon["x_coords"])))
        max_y = max(max_y, float(max(polygon["y_coords"])))

    output: list[SegmentCandidate] = []
    segment_index = 0
    for line_idx, line in enumerate(dip_results_in_lines):
        text = str(line.get("content", ""))
        trimmed_full = _trim_text_range(text, 0, len(text))
        if trimmed_full is None:
            continue

        base_ranges = _split_with_delimiters(text, trimmed_full[0], trimmed_full[1])
        expanded_ranges: list[tuple[int, int]] = []
        for start, end in base_ranges:
            for priced_start, priced_end in _split_by_repeated_prices(text, start, end):
                expanded_ranges.extend(
                    _split_out_trailing_price(text, priced_start, priced_end)
                )

        segment_order = 0
        for start, end in expanded_ranges:
            segment_text = text[start:end].strip()
            if not segment_text:
                continue
            polygon = _segment_polygon_from_char_range(
                line["polygon"], len(text), start, end
            )
            raw_x = [float(value) for value in polygon["x_coords"]]
            raw_y = [float(value) for value in polygon["y_coords"]]
            x_min = min(raw_x) / max_x
            x_max = max(raw_x) / max_x
            y_min = min(raw_y) / max_y
            y_max = max(raw_y) / max_y
            output.append(
                SegmentCandidate(
                    index=segment_index,
                    source_line_index=line_idx,
                    segment_order=segment_order,
                    text=segment_text,
                    role_hint=_classify_segment(segment_text),
                    polygon=polygon,
                    bbox={
                        "x_min": round(x_min, 4),
                        "x_max": round(x_max, 4),
                        "y_min": round(y_min, 4),
                        "y_max": round(y_max, 4),
                        "x_center": round((x_min + x_max) / 2.0, 4),
                        "y_center": round((y_min + y_max) / 2.0, 4),
                    },
                )
            )
            segment_index += 1
            segment_order += 1

    return output


def build_layout_grouping_payload(segments: list[SegmentCandidate]) -> list[dict]:
    payload: list[dict] = []
    for segment in segments:
        payload.append(
            {
                "index": segment.index,
                "source_line_index": segment.source_line_index,
                "segment_order": segment.segment_order,
                "text": segment.text,
                "bbox": segment.bbox,
                "role_hint": segment.role_hint,
            }
        )
    return payload


def _build_layout_line_wash_payload(lines: list[dict]) -> list[dict]:
    if not lines:
        return []

    max_x = 1.0
    max_y = 1.0
    for line in lines:
        polygon = line["polygon"]
        max_x = max(max_x, float(max(polygon["x_coords"])))
        max_y = max(max_y, float(max(polygon["y_coords"])))

    payload: list[dict] = []
    for idx, line in enumerate(lines):
        polygon = line["polygon"]
        x_coords = [float(value) for value in polygon["x_coords"]]
        y_coords = [float(value) for value in polygon["y_coords"]]
        x_min = min(x_coords) / max_x
        x_max = max(x_coords) / max_x
        y_min = min(y_coords) / max_y
        y_max = max(y_coords) / max_y
        payload.append(
            {
                "index": idx,
                "text": str(line.get("content", "")).strip(),
                "source_line_index": line.get("source_line_index"),
                "segment_index": line.get("segment_index"),
                "role_hint": line.get("role_hint", "unknown"),
                "origin": line.get("origin", "individual"),
                "bbox": {
                    "x_min": round(x_min, 4),
                    "x_max": round(x_max, 4),
                    "y_min": round(y_min, 4),
                    "y_max": round(y_max, 4),
                    "x_center": round((x_min + x_max) / 2.0, 4),
                    "y_center": round((y_min + y_max) / 2.0, 4),
                },
            }
        )
    return payload


def _extract_washed_segments(completion: Any) -> WashedSegments | None:
    parsed = getattr(completion, "output_parsed", None)
    if parsed is not None:
        return parsed

    output_items = getattr(completion, "output", [])
    output_types = [getattr(item, "type", "unknown") for item in output_items]
    logger.error(
        "Layout wash returned no structured output; status={}, output_types={}, output_text={}",
        getattr(completion, "status", "unknown"),
        output_types,
        getattr(completion, "output_text", ""),
    )
    return None


def _extract_layout_line_labels(
    completion: Any,
    total_lines: int,
) -> dict[int, LayoutWashLabel] | None:
    washed = _extract_washed_segments(completion)
    if washed is None:
        return None

    labels: dict[int, LayoutWashLabel] = {}
    for segment in washed.Segments:
        if segment.index < 0 or segment.index >= total_lines:
            logger.warning(
                "Skipping out-of-range line index {} in layout wash output",
                segment.index,
            )
            continue
        if segment.index in labels:
            logger.warning(
                "Skipping duplicated line index {} in layout wash output",
                segment.index,
            )
            continue
        labels[segment.index] = segment.label
    return labels


def _default_layout_line_label(line: dict) -> LayoutWashLabel:
    role_hint = str(line.get("role_hint", "")).strip().lower()
    if role_hint == "price":
        return "price"
    if role_hint == "description":
        return "description"
    return "unknown"


def partition_layout_lines_by_label(
    lines: list[dict],
    labels_by_index: dict[int, LayoutWashLabel] | None = None,
) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    dish_candidate_lines: list[dict] = []
    price_lines: list[dict] = []
    description_lines: list[dict] = []
    discarded_lines: list[dict] = []

    resolved_labels = labels_by_index or {}
    for idx, line in enumerate(lines):
        label = resolved_labels.get(idx, _default_layout_line_label(line))
        if label == "price":
            price_lines.append(line)
        elif label == "description":
            description_lines.append(line)
        elif label == "non_dish":
            discarded_lines.append(line)
        else:
            # Keep dish_title and unknown as dish candidates for recall.
            dish_candidate_lines.append(line)

    return dish_candidate_lines, price_lines, description_lines, discarded_lines


@duration
async def wash_layout_lines(
    lines: list[dict],
) -> tuple[list[dict], list[dict], list[dict], list[dict], dict[str, Any]]:
    if not lines:
        return [], [], [], [], {"mode": "wash_empty", "lineCount": 0}

    payload = _build_layout_line_wash_payload(lines)
    parse_kwargs = build_openai_reasoning_kwargs(
        settings.MENU_GROUPING_LLM_REASONING_EFFORT
    )

    mode = "wash_llm"
    try:
        completion = await asyncio.wait_for(
            _get_openai_client().responses.parse(
                model=_resolve_layout_grouping_model(),
                input=[
                    {"role": "system", "content": SEGMENTS_WASH_PROMPT},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
                ],
                text_format=WashedSegments,
                **parse_kwargs,
            ),
            timeout=settings.MENU_LAYOUT_WASH_TIMEOUT_SECONDS,
        )
        labels_by_index = _extract_layout_line_labels(completion, len(lines))
        if labels_by_index is None:
            labels_by_index = {}
            mode = "wash_parse_fallback"
    except TimeoutError:
        labels_by_index = {}
        mode = "wash_timeout_fallback"
        logger.warning(
            "Layout wash timed out after {}s",
            settings.MENU_LAYOUT_WASH_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # defensive for provider/parse failures
        labels_by_index = {}
        mode = "wash_error_fallback"
        logger.error("Layout wash LLM call failed: {}", exc)

    (
        dish_candidate_lines,
        price_lines,
        description_lines,
        discarded_lines,
    ) = partition_layout_lines_by_label(lines, labels_by_index)

    return (
        dish_candidate_lines,
        price_lines,
        description_lines,
        discarded_lines,
        {
            "mode": mode,
            "lineCount": len(lines),
            "labeledCount": len(labels_by_index),
            "dishLineCount": len(dish_candidate_lines),
            "priceLineCount": len(price_lines),
            "descriptionLineCount": len(description_lines),
            "discardedLineCount": len(discarded_lines),
        },
    )


def _extract_grouped_segments(completion: Any) -> GroupedSegments | None:
    parsed = getattr(completion, "output_parsed", None)
    if parsed is not None:
        return parsed

    output_items = getattr(completion, "output", [])
    output_types = [getattr(item, "type", "unknown") for item in output_items]
    logger.error(
        "Layout parse returned no structured output; status={}, output_types={}, output_text={}",
        getattr(completion, "status", "unknown"),
        output_types,
        getattr(completion, "output_text", ""),
    )
    return None


def _extract_segment_groups(
    completion: Any,
    total_segments: int,
) -> list[list[int]] | None:
    grouped = _extract_grouped_segments(completion)
    if grouped is None:
        return None

    groups: list[list[int]] = []
    used_indices: set[int] = set()
    for paragraph in grouped.Paragraphs:
        current_group: list[int] = []
        for segment_idx in paragraph.segment_indices:
            if segment_idx < 0 or segment_idx >= total_segments:
                logger.warning(
                    "Skipping out-of-range segment index {} in layout grouping output",
                    segment_idx,
                )
                continue
            if segment_idx in used_indices:
                logger.warning(
                    "Skipping duplicated segment index {} in layout grouping output",
                    segment_idx,
                )
                continue
            current_group.append(segment_idx)
            used_indices.add(segment_idx)
        if current_group:
            groups.append(sorted(current_group))

    return groups


def _is_description_like_segment(segment: SegmentCandidate) -> bool:
    if segment.role_hint == "description":
        return True
    if segment.role_hint == "price":
        return False

    text = segment.text.strip()
    if not text:
        return False

    words = [part for part in text.split() if part]
    if len(words) >= 7:
        return True
    if any(token in text for token in (",", ";", "，", "；", "、", "。")):
        return True
    return len(text) >= 42 and len(words) >= 4


def build_fallback_segment_groups(segments: list[SegmentCandidate]) -> list[list[int]]:
    description_like_segments = [
        segment for segment in segments if _is_description_like_segment(segment)
    ]
    if not description_like_segments:
        return []

    heights = [
        max(0.0, segment.bbox["y_max"] - segment.bbox["y_min"])
        for segment in description_like_segments
    ]
    median_height = sorted(heights)[len(heights) // 2] if heights else 0.02
    max_vertical_gap = max(0.02, median_height * 1.8)
    column_merge_threshold = 0.18

    columns: list[list[SegmentCandidate]] = []
    column_centers: list[float] = []
    for segment in sorted(description_like_segments, key=lambda item: item.bbox["x_center"]):
        best_column_idx = None
        best_delta = 1.0
        for idx, center in enumerate(column_centers):
            delta = abs(segment.bbox["x_center"] - center)
            if delta <= column_merge_threshold and delta < best_delta:
                best_column_idx = idx
                best_delta = delta
        if best_column_idx is None:
            columns.append([segment])
            column_centers.append(segment.bbox["x_center"])
            continue

        column = columns[best_column_idx]
        column.append(segment)
        column_centers[best_column_idx] = (
            sum(item.bbox["x_center"] for item in column) / len(column)
        )

    by_index = {segment.index: segment for segment in description_like_segments}
    groups: list[list[int]] = []
    for column in columns:
        ordered_column = sorted(
            column,
            key=lambda segment: (
                segment.bbox["y_min"],
                segment.source_line_index,
                segment.segment_order,
            ),
        )
        current_group: list[int] = [ordered_column[0].index]
        previous = ordered_column[0]
        for segment in ordered_column[1:]:
            vertical_gap = segment.bbox["y_min"] - previous.bbox["y_max"]
            line_gap = segment.source_line_index - previous.source_line_index
            split_group = vertical_gap > max_vertical_gap or line_gap > 2
            if split_group:
                groups.append(sorted(set(current_group)))
                current_group = [segment.index]
            else:
                current_group.append(segment.index)
            previous = segment
        if current_group:
            groups.append(sorted(set(current_group)))

    groups = [group for group in groups if group]
    groups.sort(
        key=lambda group: (
            min(by_index[idx].bbox["y_min"] for idx in group),
            min(by_index[idx].bbox["x_min"] for idx in group),
        )
    )
    return groups


def _select_group_members(
    by_index: dict[int, SegmentCandidate],
    group: list[int],
) -> list[SegmentCandidate]:
    non_price_members = [
        by_index[idx]
        for idx in group
        if idx in by_index and by_index[idx].role_hint != "price"
    ]
    if not non_price_members:
        return []

    description_members = [
        segment for segment in non_price_members if _is_description_like_segment(segment)
    ]
    if description_members:
        return description_members
    return non_price_members


def materialize_layout_groups(
    segments: list[SegmentCandidate],
    grouped_segment_indices: list[list[int]],
) -> tuple[list[dict], list[dict], list[list[int]], set[int]]:
    by_index = {segment.index: segment for segment in segments}
    paragraph_lines: list[dict] = []
    grouped_source_line_groups: list[list[int]] = []
    grouped_segment_set: set[int] = set()

    for group in grouped_segment_indices:
        members = _select_group_members(by_index, group)
        members = sorted(
            members,
            key=lambda item: (
                item.source_line_index,
                item.segment_order,
                item.index,
            ),
        )
        if not members:
            continue

        content = " ".join(member.text for member in members if member.text).strip()
        if not content:
            continue

        tmp_polygon = {"x_coords": [], "y_coords": []}
        source_lines: list[int] = []
        source_seen: set[int] = set()
        for member in members:
            tmp_polygon["x_coords"] += member.polygon["x_coords"]
            tmp_polygon["y_coords"] += member.polygon["y_coords"]
            if member.source_line_index not in source_seen:
                source_seen.add(member.source_line_index)
                source_lines.append(member.source_line_index)

        paragraph_lines.append({"content": content, "polygon": tmp_polygon})
        grouped_source_line_groups.append(source_lines)
        grouped_segment_set.update(member.index for member in members)

    individual_lines: list[dict] = []
    for segment in segments:
        if segment.index in grouped_segment_set:
            continue
        individual_lines.append(
            {
                "content": segment.text,
                "polygon": segment.polygon,
                "source_line_index": segment.source_line_index,
                "segment_index": segment.index,
                "role_hint": segment.role_hint,
            }
        )

    return (
        paragraph_lines,
        individual_lines,
        grouped_source_line_groups,
        grouped_segment_set,
    )


@duration
async def build_paragraph_layout_experiment(
    dip_results_in_lines: list[dict],
) -> tuple[list[dict], list[dict], dict[str, Any]]:
    segments = build_layout_segments(dip_results_in_lines)
    if not segments:
        return (
            [],
            dip_results_in_lines,
            {
                "mode": "layout_empty",
                "segmentCount": 0,
                "groupCount": 0,
                "groupedSegmentCount": 0,
                "groupedSourceLineGroups": [],
            },
        )

    payload = build_layout_grouping_payload(segments)
    parse_kwargs = build_openai_reasoning_kwargs(
        settings.MENU_GROUPING_LLM_REASONING_EFFORT
    )
    start_time = time.monotonic()

    try:
        completion = await asyncio.wait_for(
            _get_openai_client().responses.parse(
                model=_resolve_layout_grouping_model(),
                input=[
                    {"role": "system", "content": SEGMENTS_to_PARGRAPH_PROMPT},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
                ],
                text_format=GroupedSegments,
                **parse_kwargs,
            ),
            timeout=settings.MENU_GROUPING_TIMEOUT_SECONDS,
        )
        grouped_segments = _extract_segment_groups(completion, len(segments))
        if grouped_segments is None:
            grouped_segments = []
            mode = "layout_parse_fallback"
        else:
            mode = "layout_llm"
        (
            paragraph_lines,
            individual_lines,
            grouped_source_line_groups,
            grouped_segment_set,
        ) = (
            materialize_layout_groups(segments, grouped_segments)
        )
        fallback_used = False
        if (
            settings.MENU_LAYOUT_ENABLE_HEURISTIC_FALLBACK
            and not grouped_source_line_groups
        ):
            fallback_groups = build_fallback_segment_groups(segments)
            if fallback_groups:
                (
                    paragraph_lines,
                    individual_lines,
                    grouped_source_line_groups,
                    grouped_segment_set,
                ) = materialize_layout_groups(segments, fallback_groups)
                mode = f"{mode}_heuristic_fallback"
                fallback_used = True
    except TimeoutError:
        logger.warning(
            "Layout grouping timed out after {}s",
            settings.MENU_GROUPING_TIMEOUT_SECONDS,
        )
        return (
            [],
            dip_results_in_lines,
            {
                "mode": "layout_timeout_fallback",
                "segmentCount": len(segments),
                "groupCount": 0,
                "groupedSegmentCount": 0,
                "groupedSourceLineGroups": [],
                "fallbackUsed": False,
            },
        )
    except Exception as exc:  # defensive for provider/parse failures
        logger.error("Layout grouping LLM call failed: {}", exc)
        return (
            [],
            dip_results_in_lines,
            {
                "mode": "layout_error_fallback",
                "segmentCount": len(segments),
                "groupCount": 0,
                "groupedSegmentCount": 0,
                "groupedSourceLineGroups": [],
                "fallbackUsed": False,
                "error": f"{type(exc).__name__}: {exc}",
            },
        )

    logger.info(
        "Layout grouping elapsed={}s segments={} groups={} grouped_segments={} individual_segments={}",
        round(time.monotonic() - start_time, 3),
        len(segments),
        len(grouped_source_line_groups),
        len(grouped_segment_set),
        len(individual_lines),
    )

    return (
        paragraph_lines,
        individual_lines,
        {
            "mode": mode,
            "segmentCount": len(segments),
            "groupCount": len(grouped_source_line_groups),
            "groupedSegmentCount": len(grouped_segment_set),
            "groupedSourceLineGroups": grouped_source_line_groups,
            "fallbackUsed": fallback_used,
        },
    )
