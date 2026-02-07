from src.services.ocr.layout_grouping_experiment import (
    SegmentCandidate,
    _resolve_layout_grouping_model,
    build_fallback_segment_groups,
    build_layout_segments,
    materialize_layout_groups,
    partition_layout_lines_by_label,
)


def test_build_layout_segments_splits_delimiters_and_trailing_price():
    dip_lines = [
        {
            "content": "Beef Bowl with kimchi | Salmon Bowl with ponzu",
            "polygon": {"x_coords": [10, 510, 510, 10], "y_coords": [10, 10, 40, 40]},
        },
        {
            "content": "Udon - 1,200円",
            "polygon": {"x_coords": [10, 210, 210, 10], "y_coords": [50, 50, 80, 80]},
        },
    ]

    segments = build_layout_segments(dip_lines)

    assert len(segments) == 4
    assert [segment.source_line_index for segment in segments] == [0, 0, 1, 1]
    assert segments[0].role_hint == "title"
    assert segments[1].role_hint == "title"
    assert segments[2].text == "Udon"
    assert segments[2].role_hint == "title"
    assert segments[3].text == "1,200円"
    assert segments[3].role_hint == "price"


def test_build_layout_segments_splits_multiple_dishes_on_one_line_with_prices():
    dip_lines = [
        {
            "content": "Pasta 12.99 Burger 13.49 Salad 9.99",
            "polygon": {"x_coords": [10, 610, 610, 10], "y_coords": [10, 10, 40, 40]},
        }
    ]

    segments = build_layout_segments(dip_lines)

    assert [segment.text for segment in segments] == [
        "Pasta",
        "12.99",
        "Burger",
        "13.49",
        "Salad",
        "9.99",
    ]
    assert [segment.role_hint for segment in segments] == [
        "title",
        "price",
        "title",
        "price",
        "title",
        "price",
    ]


def test_materialize_layout_groups_preserves_titles_and_skips_prices():
    segments = [
        SegmentCandidate(
            index=0,
            source_line_index=0,
            segment_order=0,
            text="Chicken Ramen",
            role_hint="title",
            polygon={"x_coords": [10.0, 110.0, 110.0, 10.0], "y_coords": [10.0, 10.0, 30.0, 30.0]},
            bbox={"x_min": 0.1, "x_max": 0.3, "y_min": 0.1, "y_max": 0.2, "x_center": 0.2, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=1,
            source_line_index=0,
            segment_order=1,
            text="rich broth",
            role_hint="description",
            polygon={"x_coords": [120.0, 200.0, 200.0, 120.0], "y_coords": [10.0, 10.0, 30.0, 30.0]},
            bbox={"x_min": 0.31, "x_max": 0.5, "y_min": 0.1, "y_max": 0.2, "x_center": 0.405, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=2,
            source_line_index=1,
            segment_order=0,
            text="garlic oil",
            role_hint="description",
            polygon={"x_coords": [10.0, 90.0, 90.0, 10.0], "y_coords": [40.0, 40.0, 60.0, 60.0]},
            bbox={"x_min": 0.1, "x_max": 0.2, "y_min": 0.21, "y_max": 0.3, "x_center": 0.15, "y_center": 0.255},
        ),
        SegmentCandidate(
            index=3,
            source_line_index=1,
            segment_order=1,
            text="12.5",
            role_hint="price",
            polygon={"x_coords": [100.0, 140.0, 140.0, 100.0], "y_coords": [40.0, 40.0, 60.0, 60.0]},
            bbox={"x_min": 0.21, "x_max": 0.3, "y_min": 0.21, "y_max": 0.3, "x_center": 0.255, "y_center": 0.255},
        ),
    ]

    (
        paragraph_lines,
        individual_lines,
        grouped_source_line_groups,
        grouped_segment_set,
    ) = materialize_layout_groups(segments, [[1, 2]])

    assert len(paragraph_lines) == 1
    assert paragraph_lines[0]["content"] == "rich broth garlic oil"
    assert grouped_source_line_groups == [[0, 1]]
    assert grouped_segment_set == {1, 2}
    assert [line["content"] for line in individual_lines] == ["Chicken Ramen", "12.5"]


def test_build_fallback_segment_groups_clusters_description_like_segments():
    segments = [
        SegmentCandidate(
            index=0,
            source_line_index=1,
            segment_order=0,
            text="with grilled onions",
            role_hint="description",
            polygon={"x_coords": [10.0, 110.0, 110.0, 10.0], "y_coords": [10.0, 10.0, 20.0, 20.0]},
            bbox={"x_min": 0.1, "x_max": 0.3, "y_min": 0.1, "y_max": 0.2, "x_center": 0.2, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=1,
            source_line_index=2,
            segment_order=0,
            text="and garlic aioli",
            role_hint="description",
            polygon={"x_coords": [12.0, 112.0, 112.0, 12.0], "y_coords": [22.0, 22.0, 32.0, 32.0]},
            bbox={"x_min": 0.11, "x_max": 0.31, "y_min": 0.22, "y_max": 0.32, "x_center": 0.21, "y_center": 0.27},
        ),
        SegmentCandidate(
            index=2,
            source_line_index=10,
            segment_order=0,
            text="fresh berries and cream",
            role_hint="description",
            polygon={"x_coords": [320.0, 420.0, 420.0, 320.0], "y_coords": [10.0, 10.0, 20.0, 20.0]},
            bbox={"x_min": 0.72, "x_max": 0.92, "y_min": 0.1, "y_max": 0.2, "x_center": 0.82, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=3,
            source_line_index=11,
            segment_order=0,
            text="finished with mint",
            role_hint="description",
            polygon={"x_coords": [322.0, 422.0, 422.0, 322.0], "y_coords": [22.0, 22.0, 32.0, 32.0]},
            bbox={"x_min": 0.73, "x_max": 0.93, "y_min": 0.22, "y_max": 0.32, "x_center": 0.83, "y_center": 0.27},
        ),
    ]

    groups = build_fallback_segment_groups(segments)

    assert groups == [[0, 1], [2, 3]]


def test_materialize_layout_groups_uses_non_price_members_when_description_missing():
    segments = [
        SegmentCandidate(
            index=0,
            source_line_index=0,
            segment_order=0,
            text="French Toast",
            role_hint="title",
            polygon={"x_coords": [10.0, 110.0, 110.0, 10.0], "y_coords": [10.0, 10.0, 30.0, 30.0]},
            bbox={"x_min": 0.1, "x_max": 0.3, "y_min": 0.1, "y_max": 0.2, "x_center": 0.2, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=1,
            source_line_index=0,
            segment_order=1,
            text="Chef Special",
            role_hint="unknown",
            polygon={"x_coords": [120.0, 220.0, 220.0, 120.0], "y_coords": [10.0, 10.0, 30.0, 30.0]},
            bbox={"x_min": 0.31, "x_max": 0.51, "y_min": 0.1, "y_max": 0.2, "x_center": 0.41, "y_center": 0.15},
        ),
        SegmentCandidate(
            index=2,
            source_line_index=0,
            segment_order=2,
            text="$8.99",
            role_hint="price",
            polygon={"x_coords": [230.0, 280.0, 280.0, 230.0], "y_coords": [10.0, 10.0, 30.0, 30.0]},
            bbox={"x_min": 0.52, "x_max": 0.62, "y_min": 0.1, "y_max": 0.2, "x_center": 0.57, "y_center": 0.15},
        ),
    ]

    (
        paragraph_lines,
        individual_lines,
        grouped_source_line_groups,
        grouped_segment_set,
    ) = materialize_layout_groups(segments, [[0, 1, 2]])

    assert len(paragraph_lines) == 1
    assert paragraph_lines[0]["content"] == "French Toast Chef Special"
    assert grouped_source_line_groups == [[0]]
    assert grouped_segment_set == {0, 1}
    assert [line["content"] for line in individual_lines] == ["$8.99"]


def test_resolve_layout_grouping_model_prefers_layout_specific_setting(monkeypatch):
    monkeypatch.setattr(
        "src.services.ocr.layout_grouping_experiment.settings.MENU_LAYOUT_GROUPING_LLM_MODEL",
        "gpt-5-mini",
    )
    monkeypatch.setattr(
        "src.services.ocr.layout_grouping_experiment.settings.OPENAI_MODEL",
        "gpt-5-nano",
    )

    assert _resolve_layout_grouping_model() == "gpt-5-mini"


def test_resolve_layout_grouping_model_falls_back_to_openai_model(monkeypatch):
    monkeypatch.setattr(
        "src.services.ocr.layout_grouping_experiment.settings.MENU_LAYOUT_GROUPING_LLM_MODEL",
        "   ",
    )
    monkeypatch.setattr(
        "src.services.ocr.layout_grouping_experiment.settings.OPENAI_MODEL",
        "gpt-5-nano",
    )

    assert _resolve_layout_grouping_model() == "gpt-5-nano"


def test_partition_layout_lines_by_label_routes_lines_and_discards_non_dish():
    lines = [
        {"content": "Classic Burger", "role_hint": "title"},
        {"content": "with pickles and mustard", "role_hint": "description"},
        {"content": "$12.99", "role_hint": "price"},
        {"content": "OPEN 7AM - 2PM", "role_hint": "unknown"},
        {"content": "Chef Choice", "role_hint": "unknown"},
    ]

    (
        dish_lines,
        price_lines,
        description_lines,
        discarded_lines,
    ) = partition_layout_lines_by_label(
        lines,
        {
            0: "dish_title",
            1: "description",
            2: "price",
            3: "non_dish",
            4: "unknown",
        },
    )

    assert [line["content"] for line in dish_lines] == ["Classic Burger", "Chef Choice"]
    assert [line["content"] for line in price_lines] == ["$12.99"]
    assert [line["content"] for line in description_lines] == [
        "with pickles and mustard"
    ]
    assert [line["content"] for line in discarded_lines] == ["OPEN 7AM - 2PM"]


def test_partition_layout_lines_by_label_uses_role_hint_fallback_for_unlabeled_lines():
    lines = [
        {"content": "Set Menu", "role_hint": "title"},
        {"content": "selected daily ingredients", "role_hint": "description"},
        {"content": "15.50", "role_hint": "price"},
        {"content": "店内写真", "role_hint": "unknown"},
    ]

    (
        dish_lines,
        price_lines,
        description_lines,
        discarded_lines,
    ) = partition_layout_lines_by_label(lines, {})

    assert [line["content"] for line in dish_lines] == ["Set Menu", "店内写真"]
    assert [line["content"] for line in price_lines] == ["15.50"]
    assert [line["content"] for line in description_lines] == [
        "selected daily ingredients"
    ]
    assert discarded_lines == []
