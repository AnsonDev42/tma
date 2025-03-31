import http
from typing import Optional, List

from fastapi import APIRouter, Depends, UploadFile, HTTPException, Header
from pydantic import BaseModel

from src.api.deps import get_user
from src.models import User
from src.services.menu import (
    process_image,
    recommend_dishes,
    upload_pipeline_with_ocr,
    upload_pipeline_with_dip_auto_group_lines,
)
from src.services.user import record_access, get_access_limits

router = APIRouter()


@router.post("/upload", status_code=http.HTTPStatus.OK)
async def upload(
    file: UploadFile,
    user: User = Depends(get_user),
    dip: Optional[str] = Header(None),
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded"
        )

    image, img_height, img_width = process_image(file.file.read())

    if dip == "false":
        return await upload_pipeline_with_ocr(
            image, img_height, img_width, accept_language
        )
    return await upload_pipeline_with_dip_auto_group_lines(
        image, img_height, img_width, accept_language
    )


class AISuggestionsRequest(BaseModel):
    dishes: List[str]
    additional_info: Optional[str]
    language: str


@router.post("/ai-suggestions")
async def ai_suggestions(
    request: AISuggestionsRequest,
    user: User = Depends(get_user),
):
    """
    Ai suggestions for what dish to order based on all the dish name,
    and the language of the dish name
    """
    # Check if the user has remaining accesses
    access_limits = await get_access_limits(user)
    if access_limits.get("remaining_accesses", 0) == 0:
        return {
            "suggestions": "Sorry, you have exceeded your daily limit, please try again tomorrow."
        }

    suggestions = await recommend_dishes(request)
    await record_access(user)

    return {"suggestions": suggestions}
