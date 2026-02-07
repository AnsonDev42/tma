def test_menu_analyze_full_flow(client, sample_image_bytes, monkeypatch):
    async def fake_post_dip_request(_image: bytes) -> str:
        return "https://fake-dip/result/123"

    async def fake_retrieve_dip_results(_url: str, timeout: int = 3):
        return {
            "status": "succeeded",
            "analyzeResult": {
                "pages": [
                    {
                        "lines": [
                            {
                                "content": "Margherita Pizza",
                                "polygon": [10, 10, 300, 10, 300, 50, 10, 50],
                            },
                            {
                                "content": "Fresh basil and tomato sauce",
                                "polygon": [10, 55, 400, 55, 400, 90, 10, 90],
                            },
                            {
                                "content": "12.50",
                                "polygon": [500, 10, 560, 10, 560, 50, 500, 50],
                            },
                        ]
                    }
                ]
            },
        }

    async def fake_build_paragraph(lines):
        # Treat the second non-price line as a grouped paragraph.
        return [lines[1]], [lines[0]]

    async def fake_process_dip_results(lines, accept_language):
        return [
            {
                "description": f"{line['content']} ({accept_language})",
                "text": line["content"],
                "text_translation": line["content"],
                "img_src": [f"https://img/{line['content'].lower().replace(' ', '_')}"],
            }
            for line in lines
        ]

    async def fake_process_dip_paragraph_results(lines, accept_language):
        return [
            {
                "description": f"{line['content']} ({accept_language})",
                "text": line["content"],
                "text_translation": line["content"],
                "img_src": None,
            }
            for line in lines
        ]

    monkeypatch.setattr("src.services.menu.post_dip_request", fake_post_dip_request)
    monkeypatch.setattr(
        "src.services.menu.retrieve_dip_results", fake_retrieve_dip_results
    )
    monkeypatch.setattr("src.services.menu.build_paragraph", fake_build_paragraph)
    monkeypatch.setattr("src.services.menu.process_dip_results", fake_process_dip_results)
    monkeypatch.setattr(
        "src.services.menu.process_dip_paragraph_results",
        fake_process_dip_paragraph_results,
    )

    files = {"file": ("menu.jpeg", sample_image_bytes, "image/jpeg")}
    response = client.post(
        "/menu/analyze",
        files=files,
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 200

    payload = response.json()
    assert "results" in payload
    assert len(payload["results"]) == 1
    assert payload["meta"]["flowId"] == "dip.auto_group.v1"
    assert payload["meta"]["totalItems"] == 1
    assert payload["meta"]["language"] == "en"

    first = payload["results"][0]
    assert first["info"]["text"] == "Margherita Pizza"
    assert "Fresh basil and tomato sauce (en)" in first["info"]["description"]
    assert 0 <= first["boundingBox"]["x"] <= 1
    assert 0 <= first["boundingBox"]["y"] <= 1
    assert 0 <= first["boundingBox"]["w"] <= 1
    assert 0 <= first["boundingBox"]["h"] <= 1


def test_menu_analyze_rejects_unknown_flow(client, sample_image_bytes):
    files = {"file": ("menu.jpeg", sample_image_bytes, "image/jpeg")}
    response = client.post(
        "/menu/analyze?flowId=non-existing-flow",
        files=files,
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "availableFlows" in detail
    assert "dip.auto_group.v1" in detail["availableFlows"]


def test_menu_analyze_timeout_fallback_returns_non_error_payload(
    client,
    sample_image_bytes,
    monkeypatch,
):
    async def fake_post_dip_request(_image: bytes) -> str:
        return "https://fake-dip/result/timeout-fallback"

    async def fake_retrieve_dip_results(_url: str, timeout: int = 3):
        return {
            "status": "succeeded",
            "analyzeResult": {
                "pages": [
                    {
                        "lines": [
                            {
                                "content": "Margherita Pizza",
                                "polygon": [10, 10, 300, 10, 300, 50, 10, 50],
                            },
                            {
                                "content": "Fresh basil and tomato sauce",
                                "polygon": [10, 55, 400, 55, 400, 90, 10, 90],
                            },
                        ]
                    }
                ]
            },
        }

    async def fake_build_paragraph(lines):
        # Simulate timeout fallback behavior: no grouped paragraphs.
        return [], lines

    async def fake_process_dip_results(lines, accept_language):
        return [
            {
                "description": f"{line['content']} ({accept_language})",
                "text": line["content"],
                "text_translation": line["content"],
                "img_src": None,
            }
            for line in lines
        ]

    async def fake_process_dip_paragraph_results(lines, accept_language):
        return []

    monkeypatch.setattr("src.services.menu.post_dip_request", fake_post_dip_request)
    monkeypatch.setattr(
        "src.services.menu.retrieve_dip_results", fake_retrieve_dip_results
    )
    monkeypatch.setattr("src.services.menu.build_paragraph", fake_build_paragraph)
    monkeypatch.setattr("src.services.menu.process_dip_results", fake_process_dip_results)
    monkeypatch.setattr(
        "src.services.menu.process_dip_paragraph_results",
        fake_process_dip_paragraph_results,
    )

    files = {"file": ("menu.jpeg", sample_image_bytes, "image/jpeg")}
    response = client.post(
        "/menu/analyze",
        files=files,
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["flowId"] == "dip.auto_group.v1"
    assert payload["meta"]["totalItems"] == 2
    assert len(payload["results"]) == 2


def test_menu_analyze_fast_flow_uses_lines_only_path(client, sample_image_bytes, monkeypatch):
    async def fake_run_dip(_image: bytes):
        return [
            {
                "content": "Burger",
                "polygon": {"x_coords": [10, 100], "y_coords": [10, 40]},
            }
        ]

    async def fake_process_dip_results(lines, _accept_language):
        return [
            {
                "description": line["content"],
                "text": line["content"],
                "text_translation": line["content"],
                "img_src": None,
            }
            for line in lines
        ]

    def fail_build_paragraph(_lines):
        raise AssertionError("build_paragraph should not be called for fast flow")

    monkeypatch.setattr("src.services.menu.run_dip", fake_run_dip)
    monkeypatch.setattr("src.services.menu.process_dip_results", fake_process_dip_results)
    monkeypatch.setattr("src.services.menu.build_paragraph", fail_build_paragraph)

    files = {"file": ("menu.jpeg", sample_image_bytes, "image/jpeg")}
    response = client.post(
        "/menu/analyze?flowId=fast",
        files=files,
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["flowId"] == "dip.lines_only.v1"
    assert payload["meta"]["totalItems"] == 1
    assert len(payload["results"]) == 1


def test_menu_analyze_layout_experiment_flow_uses_experimental_pipeline(
    client,
    sample_image_bytes,
    monkeypatch,
):
    async def fake_layout_pipeline(_image: bytes, _accept_language: str | None):
        return {
            "results": [
                {
                    "id": 0,
                    "info": {
                        "description": "layout description",
                        "text": "layout item",
                        "text_translation": "layout item",
                        "img_src": None,
                    },
                    "boundingBox": {"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.1},
                }
            ]
        }

    monkeypatch.setattr(
        "src.services.menu.analyze_menu_image_layout_grouping_experiment",
        fake_layout_pipeline,
    )

    files = {"file": ("menu.jpeg", sample_image_bytes, "image/jpeg")}
    response = client.post(
        "/menu/analyze?flowId=layoutexp",
        files=files,
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["flowId"] == "dip.layout_segments_llm.v1"
    assert payload["meta"]["totalItems"] == 1
    assert payload["results"][0]["info"]["text"] == "layout item"


def test_menu_flow_catalog(client):
    response = client.get("/menu/flows")
    assert response.status_code == 200

    payload = response.json()
    assert "defaultFlowId" in payload
    assert "flows" in payload
    assert any(flow["id"] == "dip.auto_group.v1" for flow in payload["flows"])
    assert any(flow["id"] == "dip.layout_segments_llm.v1" for flow in payload["flows"])
