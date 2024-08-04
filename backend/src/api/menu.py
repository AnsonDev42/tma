import http
from typing import Optional, List

from fastapi import APIRouter, Depends, UploadFile, HTTPException, Header
from pydantic import BaseModel

from src.api.deps import get_user
from src.models import User
from src.services.menu import (
    run_ocr,
    process_ocr_results,
    process_image,
    normalize_text_bbox,
    serialize_dish_data,
    recommend_dishes,
)
from src.services.user import record_access, get_access_limits

router = APIRouter()


@router.post("/upload")
async def upload(
        file: UploadFile,
        user: User = Depends(get_user),
        accept_language: Optional[str] = Header(None),
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded"
        )

    image, img_height, img_width = process_image(file.file.read())
    ocr_results = run_ocr(image)
    dish_info = await process_ocr_results(ocr_results, accept_language)
    bounding_box = normalize_text_bbox(img_width, img_height, ocr_results)
    data = serialize_dish_data(dish_info, bounding_box)
    return {"results": data}


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
    if access_limits.get("remaining_accesses",0) == 0:
        return {"suggestions": "Sorry, you have exceeded your daily limit, please try again tomorrow."}

    suggestions = await recommend_dishes(request)
    await record_access(user)

    return {"suggestions": suggestions}
