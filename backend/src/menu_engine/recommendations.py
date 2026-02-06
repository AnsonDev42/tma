from typing import Any, Mapping, Protocol

from src.menu_engine.contracts import (
    MenuRecommendationMetaContract,
    MenuRecommendationRequestContract,
    MenuRecommendationResponseContract,
)
from src.models import User
from src.services.menu import recommend_dishes
from src.services.user import get_access_limits, record_access

LIMIT_REACHED_MESSAGE = (
    "Sorry, you have exceeded your daily limit, please try again tomorrow."
)


class AccessPolicyRepository(Protocol):
    async def get_access_limits(self, user: User) -> Mapping[str, Any]:
        ...

    async def record_access(self, user: User) -> None:
        ...


class RecommendationGenerator(Protocol):
    async def recommend(self, request: MenuRecommendationRequestContract) -> str:
        ...


class SupabaseAccessPolicyRepository:
    async def get_access_limits(self, user: User) -> Mapping[str, Any]:
        return await get_access_limits(user)

    async def record_access(self, user: User) -> None:
        await record_access(user)


class LLMRecommendationGenerator:
    async def recommend(self, request: MenuRecommendationRequestContract) -> str:
        return await recommend_dishes(request)


class MenuRecommendationService:
    def __init__(
        self,
        *,
        access_policy_repository: AccessPolicyRepository,
        recommendation_generator: RecommendationGenerator,
    ):
        self._access_policy_repository = access_policy_repository
        self._recommendation_generator = recommendation_generator

    async def recommend_for_user(
        self,
        *,
        request: MenuRecommendationRequestContract,
        user: User,
    ) -> MenuRecommendationResponseContract:
        limits = await self._access_policy_repository.get_access_limits(user)

        raw_remaining = limits.get("remaining_accesses", 0)
        try:
            remaining_accesses = max(0, int(raw_remaining))
        except (TypeError, ValueError):
            remaining_accesses = 0

        if remaining_accesses == 0:
            return MenuRecommendationResponseContract(
                suggestions=LIMIT_REACHED_MESSAGE,
                meta=MenuRecommendationMetaContract(
                    limit_reached=True,
                    remaining_accesses=0,
                ),
            )

        suggestions = await self._recommendation_generator.recommend(request)
        await self._access_policy_repository.record_access(user)

        return MenuRecommendationResponseContract(
            suggestions=suggestions,
            meta=MenuRecommendationMetaContract(
                limit_reached=False,
                remaining_accesses=max(remaining_accesses - 1, 0),
            ),
        )
