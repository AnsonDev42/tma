import re
from dataclasses import dataclass


TRAILING_PRICE_PATTERN = re.compile(
    r"[-–—]\s*(?:[$€£¥]\s*)?\d{1,4}(?:[.,]\d{1,2})?\s*$"
)
FULL_PRICE_PATTERN = re.compile(
    r"^(?:[$€£¥]\s*)?\d{1,4}(?:[.,]\d{1,2})?(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb))?$",
    re.IGNORECASE,
)
NUMERIC_TOKEN_PATTERN = re.compile(r"\d{1,4}(?:[.,]\d{1,2})?")
DESCRIPTION_HINT_TOKENS = (
    "with",
    "served",
    "fresh",
    "crispy",
    "grilled",
    "roasted",
    "sauce",
    "cheese",
    "tomato",
    "chicken",
    "beef",
    "pork",
    "fish",
    "vegetable",
)


@dataclass(frozen=True, slots=True)
class LineFeatures:
    index: int
    text: str
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    x_center: float
    y_center: float
    has_price_like_pattern: bool
    is_numeric_only: bool
    word_count: int


@dataclass(frozen=True, slots=True)
class GroupingDecision:
    mode: str
    confidence: float
    groups: list[list[int]]
    ambiguous: bool
    ambiguous_reasons: list[str]


def _normalize_numeric_text(text: str) -> str:
    return re.sub(r"[\s$€£¥.,\-–—:]", "", text).lower()


def _is_numeric_only(text: str) -> bool:
    normalized = _normalize_numeric_text(text)
    return bool(normalized) and normalized.isdigit()


def _has_price_like_pattern(text: str) -> bool:
    stripped = text.strip()
    if FULL_PRICE_PATTERN.fullmatch(stripped):
        return True
    if TRAILING_PRICE_PATTERN.search(stripped):
        return True

    numeric_hits = NUMERIC_TOKEN_PATTERN.findall(stripped)
    if not numeric_hits:
        return False
    if len(numeric_hits) == 1 and len(stripped.split()) <= 3:
        return True
    return False


def build_line_features(dip_results_in_lines: list[dict]) -> list[LineFeatures]:
    if not dip_results_in_lines:
        return []

    max_x = 1.0
    max_y = 1.0
    for line in dip_results_in_lines:
        polygon = line["polygon"]
        max_x = max(max_x, float(max(polygon["x_coords"])))
        max_y = max(max_y, float(max(polygon["y_coords"])))

    features: list[LineFeatures] = []
    for index, line in enumerate(dip_results_in_lines):
        text = str(line.get("content", "")).strip()
        polygon = line["polygon"]
        raw_x = [float(value) for value in polygon["x_coords"]]
        raw_y = [float(value) for value in polygon["y_coords"]]
        x_min = min(raw_x) / max_x
        x_max = max(raw_x) / max_x
        y_min = min(raw_y) / max_y
        y_max = max(raw_y) / max_y
        word_count = len([part for part in text.split() if part])

        features.append(
            LineFeatures(
                index=index,
                text=text,
                x_min=x_min,
                x_max=x_max,
                y_min=y_min,
                y_max=y_max,
                x_center=(x_min + x_max) / 2.0,
                y_center=(y_min + y_max) / 2.0,
                has_price_like_pattern=_has_price_like_pattern(text),
                is_numeric_only=_is_numeric_only(text),
                word_count=word_count,
            )
        )

    return features


def _resolve_column_ids(features: list[LineFeatures]) -> dict[int, int]:
    if len(features) < 4:
        return {feature.index: 0 for feature in features}

    min_x = min(feature.x_center for feature in features)
    max_x = max(feature.x_center for feature in features)
    spread = max_x - min_x
    if spread < 0.22:
        return {feature.index: 0 for feature in features}

    sorted_x = sorted(feature.x_center for feature in features)
    median = sorted_x[len(sorted_x) // 2]
    left = [feature for feature in features if feature.x_center < median]
    right = [feature for feature in features if feature.x_center >= median]
    if len(left) < 2 or len(right) < 2:
        return {feature.index: 0 for feature in features}

    left_max = max(feature.x_center for feature in left)
    right_min = min(feature.x_center for feature in right)
    if right_min - left_max < 0.12:
        return {feature.index: 0 for feature in features}

    mapping: dict[int, int] = {}
    for feature in features:
        mapping[feature.index] = 0 if feature.x_center < median else 1
    return mapping


def _is_description_candidate(feature: LineFeatures) -> bool:
    if feature.is_numeric_only or feature.has_price_like_pattern:
        return False
    if feature.word_count >= 6:
        return True
    if "," in feature.text or ";" in feature.text:
        return True
    lowered = feature.text.lower()
    if any(token in lowered for token in DESCRIPTION_HINT_TOKENS):
        return True
    if len(feature.text) > 45 and feature.word_count >= 4:
        return True
    return False


def _is_title_candidate(feature: LineFeatures) -> bool:
    if feature.is_numeric_only:
        return False
    if feature.has_price_like_pattern:
        return True
    if _is_description_candidate(feature):
        return False
    if feature.word_count <= 5:
        return True
    return len(feature.text) <= 30 and feature.word_count <= 7


def heuristic_group_lines(features: list[LineFeatures]) -> GroupingDecision:
    if not features:
        return GroupingDecision(
            mode="heuristic",
            confidence=1.0,
            groups=[],
            ambiguous=False,
            ambiguous_reasons=[],
        )

    column_ids = _resolve_column_ids(features)
    grouped_indices: list[list[int]] = []
    ambiguous_reasons: set[str] = set()
    sorted_heights = sorted(feature.y_max - feature.y_min for feature in features)
    median_line_height = sorted_heights[len(sorted_heights) // 2]
    max_gap_to_title = max(0.14, median_line_height * 3.0)
    max_gap_between_description_lines = max(0.055, median_line_height * 1.6)

    per_column: dict[int, list[LineFeatures]] = {}
    for feature in features:
        per_column.setdefault(column_ids.get(feature.index, 0), []).append(feature)

    for column, column_features in per_column.items():
        ordered = sorted(column_features, key=lambda item: item.y_center)
        current_group: list[int] = []
        current_group_last_y: float | None = None
        last_title: LineFeatures | None = None

        for feature in ordered:
            if feature.is_numeric_only:
                if current_group:
                    grouped_indices.append(current_group)
                    current_group = []
                    current_group_last_y = None
                continue

            if _is_title_candidate(feature):
                if current_group:
                    grouped_indices.append(current_group)
                    current_group = []
                    current_group_last_y = None
                last_title = feature
                continue

            if not _is_description_candidate(feature):
                ambiguous_reasons.add("uncertain_line_type")
                continue

            if last_title is None:
                ambiguous_reasons.add("description_without_title")
                continue

            gap_to_title = feature.y_center - last_title.y_center
            if gap_to_title < 0 or gap_to_title > max_gap_to_title:
                ambiguous_reasons.add("description_far_from_title")
                if current_group:
                    grouped_indices.append(current_group)
                    current_group = []
                    current_group_last_y = None
                continue

            if (
                current_group_last_y is not None
                and feature.y_center - current_group_last_y
                > max_gap_between_description_lines
            ):
                grouped_indices.append(current_group)
                current_group = []

            current_group.append(feature.index)
            current_group_last_y = feature.y_center

        if current_group:
            grouped_indices.append(current_group)

        if len(per_column) > 1 and not grouped_indices:
            ambiguous_reasons.add(f"column_{column}_has_no_groups")

    groups = [sorted(set(group)) for group in grouped_indices if group]
    ambiguity_score = len(ambiguous_reasons) / max(1, len(features))
    confidence = max(0.0, min(1.0, 1.0 - ambiguity_score))
    ambiguous = bool(ambiguous_reasons) or (confidence < 0.75)
    if not groups and len(features) > 12:
        ambiguous = True
        ambiguous_reasons.add("no_description_groups_detected")
        confidence = min(confidence, 0.6)

    return GroupingDecision(
        mode="heuristic",
        confidence=confidence,
        groups=groups,
        ambiguous=ambiguous,
        ambiguous_reasons=sorted(ambiguous_reasons),
    )


def should_invoke_llm_grouping(
    decision: GroupingDecision,
    *,
    line_count: int,
    llm_line_threshold: int,
) -> bool:
    return line_count > llm_line_threshold and decision.ambiguous


def build_compact_grouping_payload(features: list[LineFeatures]) -> list[dict]:
    payload: list[dict] = []
    for feature in features:
        payload.append(
            {
                "index": feature.index,
                "text": feature.text,
                "bbox": {
                    "x_min": round(feature.x_min, 4),
                    "x_max": round(feature.x_max, 4),
                    "y_min": round(feature.y_min, 4),
                    "y_max": round(feature.y_max, 4),
                    "x_center": round(feature.x_center, 4),
                    "y_center": round(feature.y_center, 4),
                },
                "flags": {
                    "price_like": feature.has_price_like_pattern,
                    "numeric_only": feature.is_numeric_only,
                    "word_count": feature.word_count,
                },
            }
        )
    return payload
