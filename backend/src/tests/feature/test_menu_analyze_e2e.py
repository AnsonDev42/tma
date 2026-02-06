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

    def fake_build_paragraph(lines):
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
    assert len(payload["results"]) == 2
    assert payload["meta"]["flowId"] == "dip.auto_group.v1"
    assert payload["meta"]["totalItems"] == 2
    assert payload["meta"]["language"] == "en"

    first = payload["results"][0]
    assert first["info"]["text"] == "Margherita Pizza"
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


def test_menu_flow_catalog(client):
    response = client.get("/menu/flows")
    assert response.status_code == 200

    payload = response.json()
    assert "defaultFlowId" in payload
    assert "flows" in payload
    assert any(flow["id"] == "dip.auto_group.v1" for flow in payload["flows"])
