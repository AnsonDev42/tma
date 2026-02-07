from src.services.menu import (
    filter_dip_lines,
    format_polygon,
    merge_grouped_context_into_dishes,
    normalize_bounding_box,
    serialize_dish_data_filtered,
)


def test_filter_dip_lines_removes_numeric_and_unknown_lines():
    dip_lines = [
        {"content": "Margherita Pizza"},
        {"content": "12.5"},
        {"content": "  unknown "},
        {"content": "Fresh basil and tomato sauce"},
    ]

    result = filter_dip_lines(dip_lines)

    assert [line["content"] for line in result] == [
        "Margherita Pizza",
        "Fresh basil and tomato sauce",
    ]


def test_filter_dip_lines_can_preserve_unknown_and_numeric_when_requested():
    dip_lines = [
        {"content": "Margherita Pizza"},
        {"content": "12.5"},
        {"content": "unknown"},
        {"content": "Fresh basil and tomato sauce"},
    ]

    result = filter_dip_lines(
        dip_lines,
        remove_unknown=False,
        remove_numeric_only=False,
    )

    assert [line["content"] for line in result] == [
        "Margherita Pizza",
        "12.5",
        "unknown",
        "Fresh basil and tomato sauce",
    ]


def test_format_polygon_splits_coordinate_pairs():
    polygon = [10, 20, 100, 20, 100, 60, 10, 60]

    result = format_polygon(polygon)

    assert result == {"x_coords": [10, 100, 100, 10], "y_coords": [20, 20, 60, 60]}


def test_normalize_bounding_box_returns_percentages():
    result = normalize_bounding_box(
        200,
        100,
        azure_dip_polygon={"x_coords": [20, 100, 100, 20], "y_coords": [10, 10, 30, 30]},
    )

    assert result.x == 0.1
    assert result.y == 0.1
    assert result.w == 0.4
    assert result.h == 0.2


def test_serialize_dish_data_filtered_skips_unknown_items():
    dish_data = [
        {"text": "Unknown", "description": None},
        {"text": "Margherita Pizza", "description": "Classic pizza"},
    ]
    bounding_boxes = [
        {"x": 0.0, "y": 0.0, "w": 0.1, "h": 0.1},
        {"x": 0.2, "y": 0.2, "w": 0.3, "h": 0.1},
    ]

    result = serialize_dish_data_filtered(dish_data, bounding_boxes)

    assert len(result) == 1
    assert result[0]["id"] == 0
    assert result[0]["info"]["text"] == "Margherita Pizza"


def test_merge_grouped_context_into_dishes_attaches_paragraph_to_nearest_dish():
    dish_info = [
        {"text": "Muffin", "text_translation": "Muffin", "description": "Muffin intro"},
        {"text": "Avocado Toast", "text_translation": "Avocado Toast", "description": "Toast intro"},
    ]
    dish_boxes = [
        {"x": 0.10, "y": 0.20, "w": 0.12, "h": 0.02},
        {"x": 0.10, "y": 0.30, "w": 0.18, "h": 0.02},
    ]
    paragraph_info = [
        {
            "text": "Toasted bread with smashed avocado",
            "text_translation": "Toasted bread with smashed avocado",
            "description": "Toasted bread with smashed avocado",
        }
    ]
    paragraph_boxes = [{"x": 0.10, "y": 0.32, "w": 0.30, "h": 0.03}]

    merged_info, merged_boxes = merge_grouped_context_into_dishes(
        dish_info,
        dish_boxes,
        paragraph_info,
        paragraph_boxes,
    )

    assert "Toasted bread with smashed avocado" in merged_info[1]["description"]
    assert merged_info[0]["description"] == "Muffin intro"
    assert merged_boxes[1]["h"] > dish_boxes[1]["h"]


def test_merge_grouped_context_into_dishes_attaches_price_line():
    dish_info = [{"text": "Muffin", "text_translation": "Muffin", "description": "Muffin intro"}]
    dish_boxes = [{"x": 0.10, "y": 0.20, "w": 0.12, "h": 0.02}]
    paragraph_info: list[dict] = []
    paragraph_boxes: list[dict] = []
    price_lines = [{"content": "$3.99"}]
    price_boxes = [{"x": 0.32, "y": 0.20, "w": 0.08, "h": 0.02}]

    merged_info, merged_boxes = merge_grouped_context_into_dishes(
        dish_info,
        dish_boxes,
        paragraph_info,
        paragraph_boxes,
        price_lines=price_lines,
        price_boxes=price_boxes,
    )

    assert merged_info[0]["price"] == "$3.99"
    assert merged_boxes[0]["w"] > dish_boxes[0]["w"]
