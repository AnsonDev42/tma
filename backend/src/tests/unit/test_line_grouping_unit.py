from src.services.ocr.line_grouping import build_line_features, heuristic_group_lines


def test_heuristic_grouping_single_column_description_pairing():
    dip_lines = [
        {
            "content": "Margherita - 12",
            "polygon": {"x_coords": [10, 220], "y_coords": [10, 35]},
        },
        {
            "content": "Fresh basil, tomato sauce and mozzarella",
            "polygon": {"x_coords": [12, 260], "y_coords": [38, 62]},
        },
        {
            "content": "Carbonara - 14",
            "polygon": {"x_coords": [10, 220], "y_coords": [70, 95]},
        },
        {
            "content": "Guanciale, egg yolk and pecorino",
            "polygon": {"x_coords": [12, 250], "y_coords": [98, 122]},
        },
    ]

    features = build_line_features(dip_lines)
    decision = heuristic_group_lines(features)

    assert decision.groups == [[1], [3]]
    assert decision.confidence > 0.7


def test_heuristic_grouping_handles_two_columns_independently():
    dip_lines = [
        {
            "content": "Burger - 11",
            "polygon": {"x_coords": [10, 210], "y_coords": [10, 35]},
        },
        {
            "content": "Beef patty, lettuce and house sauce",
            "polygon": {"x_coords": [10, 250], "y_coords": [38, 62]},
        },
        {
            "content": "Salmon Bowl - 16",
            "polygon": {"x_coords": [360, 590], "y_coords": [12, 36]},
        },
        {
            "content": "Rice, avocado, sesame and ponzu",
            "polygon": {"x_coords": [360, 620], "y_coords": [40, 64]},
        },
    ]

    features = build_line_features(dip_lines)
    decision = heuristic_group_lines(features)

    grouped = {tuple(group) for group in decision.groups}
    assert grouped == {(1,), (3,)}
    assert decision.confidence > 0.7


def test_heuristic_grouping_does_not_anchor_from_price_only_lines():
    dip_lines = [
        {
            "content": "12.5",
            "polygon": {"x_coords": [10, 60], "y_coords": [10, 30]},
        },
        {
            "content": "with lemon and mint",
            "polygon": {"x_coords": [10, 220], "y_coords": [34, 58]},
        },
    ]

    features = build_line_features(dip_lines)
    decision = heuristic_group_lines(features)

    assert features[0].is_numeric_only is True
    assert decision.groups == []
    assert "description_without_title" in decision.ambiguous_reasons
