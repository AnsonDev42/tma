import http
from functools import lru_cache

from fastapi import Header, HTTPException

from src.core.config import settings
from src.core.security import verify_jwt
from src.menu_engine.analysis import (
    DipAutoGroupAnalysisFlow,
    DipLinesOnlyAnalysisFlow,
    MenuAnalysisService,
    MenuFlowRegistry,
)
from src.menu_engine.recommendations import (
    LLMRecommendationGenerator,
    MenuRecommendationService,
    SupabaseAccessPolicyRepository,
)
from src.models import User


def get_user(authorization: str = Header(..., alias="Authorization")) -> User:
    try:
        prefix = "Bearer "
        if not authorization.startswith(prefix):
            raise ValueError("Invalid authorization header")
        token = authorization[len(prefix):]
        payload = verify_jwt(token)
        return User(**payload)
    except Exception:
        raise HTTPException(status_code=http.HTTPStatus.UNAUTHORIZED)


def _parse_csv(raw_value: str) -> list[str]:
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _parse_alias_map(raw_value: str) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for pair in _parse_csv(raw_value):
        if "=" not in pair:
            continue
        alias, target = pair.split("=", 1)
        cleaned_alias = alias.strip()
        cleaned_target = target.strip()
        if cleaned_alias and cleaned_target:
            aliases[cleaned_alias] = cleaned_target
    return aliases


@lru_cache
def get_menu_flow_registry() -> MenuFlowRegistry:
    registered_flows = {
        DipAutoGroupAnalysisFlow.descriptor.id: DipAutoGroupAnalysisFlow(),
        DipLinesOnlyAnalysisFlow.descriptor.id: DipLinesOnlyAnalysisFlow(),
    }

    enabled_flow_ids = _parse_csv(settings.MENU_ENABLED_FLOW_IDS)
    enabled_flows = [
        registered_flows[flow_id]
        for flow_id in enabled_flow_ids
        if flow_id in registered_flows
    ]
    if not enabled_flows:
        enabled_flows = list(registered_flows.values())

    return MenuFlowRegistry(
        flows=enabled_flows,
        default_flow_id=settings.MENU_DEFAULT_FLOW_ID,
        aliases=_parse_alias_map(settings.MENU_FLOW_ALIASES),
    )


def get_menu_analysis_service() -> MenuAnalysisService:
    return MenuAnalysisService(flow_registry=get_menu_flow_registry())


@lru_cache
def get_menu_recommendation_service() -> MenuRecommendationService:
    return MenuRecommendationService(
        access_policy_repository=SupabaseAccessPolicyRepository(),
        recommendation_generator=LLMRecommendationGenerator(),
    )
