def test_menu_recommendations_blocks_when_daily_limit_reached(client, monkeypatch):
    async def fake_get_access_limits(_user):
        return {"remaining_accesses": 0}

    async def fake_recommend_dishes(_request):
        return "Should not be called"

    async def fake_record_access(_user):
        raise AssertionError("record_access should not be called when limited")

    monkeypatch.setattr("src.api.menu.get_access_limits", fake_get_access_limits)
    monkeypatch.setattr("src.api.menu.recommend_dishes", fake_recommend_dishes)
    monkeypatch.setattr("src.api.menu.record_access", fake_record_access)

    response = client.post(
        "/menu/recommendations",
        json={
            "dishes": ["Margherita Pizza", "Tiramisu"],
            "additional_info": "2 people",
            "language": "en",
        },
    )

    assert response.status_code == 200
    assert "exceeded your daily limit" in response.json()["suggestions"]


def test_menu_recommendations_records_access_on_success(client, monkeypatch):
    state = {"recorded": False}

    async def fake_get_access_limits(_user):
        return {"remaining_accesses": 3}

    async def fake_recommend_dishes(_request):
        return "Order Margherita Pizza and Tiramisu."

    async def fake_record_access(_user):
        state["recorded"] = True

    monkeypatch.setattr("src.api.menu.get_access_limits", fake_get_access_limits)
    monkeypatch.setattr("src.api.menu.recommend_dishes", fake_recommend_dishes)
    monkeypatch.setattr("src.api.menu.record_access", fake_record_access)

    response = client.post(
        "/menu/recommendations",
        json={
            "dishes": ["Margherita Pizza", "Tiramisu"],
            "additional_info": "2 people",
            "language": "en",
        },
    )

    assert response.status_code == 200
    assert response.json()["suggestions"].startswith("Order")
    assert state["recorded"] is True
