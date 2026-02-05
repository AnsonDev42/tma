from src.services.menu import (
    filter_dip_lines,
    format_polygon,
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
