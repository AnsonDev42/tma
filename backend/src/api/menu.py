import http
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile

from src.api.deps import (
    get_menu_analysis_service,
    get_menu_recommendation_service,
    get_user,
)
from src.menu_engine.analysis import FlowNotFoundError, MenuAnalysisService
from src.menu_engine.contracts import (
    MenuAnalyzeResponseContract,
    MenuFlowCatalogContract,
    MenuRecommendationRequestContract,
    MenuRecommendationResponseContract,
)
from src.menu_engine.recommendations import MenuRecommendationService
from src.models import User

router = APIRouter(prefix="/menu", tags=["menu"])


@router.post(
    "/analyze",
    status_code=http.HTTPStatus.OK,
    response_model=MenuAnalyzeResponseContract,
)
async def analyze_menu(
    file: UploadFile,
    _user: User = Depends(get_user),
    accept_language: Annotated[str | None, Header(alias="Accept-Language")] = None,
    flow_id_query: Annotated[str | None, Query(alias="flowId")] = None,
    flow_id_header: Annotated[str | None, Header(alias="X-Menu-Flow")] = None,
    menu_analysis_service: MenuAnalysisService = Depends(get_menu_analysis_service),
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded"
        )

    image = await file.read()
    if not image:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST, detail="Uploaded file is empty"
        )

    try:
        return await menu_analysis_service.analyze(
            image=image,
            accept_language=accept_language,
            flow_hint=flow_id_query or flow_id_header,
        )
    except FlowNotFoundError as exc:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST,
            detail={
                "message": f"Unknown flow '{exc.requested_flow}'",
                "availableFlows": exc.available_flow_ids,
            },
        ) from exc


@router.get(
    "/flows",
    status_code=http.HTTPStatus.OK,
    response_model=MenuFlowCatalogContract,
)
async def list_menu_flows(
    _user: User = Depends(get_user),
    menu_analysis_service: MenuAnalysisService = Depends(get_menu_analysis_service),
):
    return menu_analysis_service.flow_catalog()


@router.post(
    "/recommendations",
    status_code=http.HTTPStatus.OK,
    response_model=MenuRecommendationResponseContract,
)
async def menu_recommendations(
    request: MenuRecommendationRequestContract,
    user: User = Depends(get_user),
    menu_recommendation_service: MenuRecommendationService = Depends(
        get_menu_recommendation_service
    ),
):
    return await menu_recommendation_service.recommend_for_user(
        request=request,
        user=user,
    )
