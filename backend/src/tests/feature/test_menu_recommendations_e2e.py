from src.api.deps import get_menu_recommendation_service
from src.main import app
from src.menu_engine.contracts import (
    MenuRecommendationMetaContract,
    MenuRecommendationResponseContract,
)


def test_menu_recommendations_blocks_when_daily_limit_reached(client):
    class FakeRecommendationService:
        async def recommend_for_user(self, *, request, user):
            return MenuRecommendationResponseContract(
                suggestions=(
                    "Sorry, you have exceeded your daily limit, please try again tomorrow."
                ),
                meta=MenuRecommendationMetaContract(
                    limit_reached=True,
                    remaining_accesses=0,
                ),
            )

    app.dependency_overrides[get_menu_recommendation_service] = (
        lambda: FakeRecommendationService()
    )
    try:
        response = client.post(
            "/menu/recommendations",
            json={
                "dishes": ["Margherita Pizza", "Tiramisu"],
                "additional_info": "2 people",
                "language": "en",
            },
        )
    finally:
        app.dependency_overrides.pop(get_menu_recommendation_service, None)

    assert response.status_code == 200
    payload = response.json()
    assert "exceeded your daily limit" in payload["suggestions"]
    assert payload["meta"]["limitReached"] is True
    assert payload["meta"]["remainingAccesses"] == 0


def test_menu_recommendations_records_access_on_success(client):
    state = {"called": False}

    class FakeRecommendationService:
        async def recommend_for_user(self, *, request, user):
            state["called"] = True
            return MenuRecommendationResponseContract(
                suggestions="Order Margherita Pizza and Tiramisu.",
                meta=MenuRecommendationMetaContract(
                    limit_reached=False,
                    remaining_accesses=2,
                ),
            )

    app.dependency_overrides[get_menu_recommendation_service] = (
        lambda: FakeRecommendationService()
    )
    try:
        response = client.post(
            "/menu/recommendations",
            json={
                "dishes": ["Margherita Pizza", "Tiramisu"],
                "additional_info": "2 people",
                "language": "en",
            },
        )
    finally:
        app.dependency_overrides.pop(get_menu_recommendation_service, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["suggestions"].startswith("Order")
    assert payload["meta"]["limitReached"] is False
    assert payload["meta"]["remainingAccesses"] == 2
    assert state["called"] is True
