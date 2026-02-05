import http
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile
from pydantic import BaseModel

from src.api.deps import get_user
from src.models import User
from src.services.menu import analyze_menu_image, recommend_dishes
from src.services.user import get_access_limits, record_access

router = APIRouter(prefix="/menu", tags=["menu"])


class AISuggestionsRequest(BaseModel):
    dishes: list[str]
    additional_info: Optional[str]
    language: str


@router.post("/analyze", status_code=http.HTTPStatus.OK)
async def analyze_menu(
    file: UploadFile,
    _user: User = Depends(get_user),
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
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

    return await analyze_menu_image(image, accept_language)


@router.post("/recommendations")
async def menu_recommendations(
    request: AISuggestionsRequest,
    user: User = Depends(get_user),
):
    access_limits = await get_access_limits(user)
    if access_limits.get("remaining_accesses", 0) == 0:
        return {
            "suggestions": "Sorry, you have exceeded your daily limit, please try again tomorrow."
        }

    suggestions = await recommend_dishes(request)
    await record_access(user)

    return {"suggestions": suggestions}
