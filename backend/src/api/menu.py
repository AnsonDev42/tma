import http
from io import BytesIO
from typing import Optional

import cv2
import ujson
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Header
from httpx import HTTPStatusError
from postgrest import APIError
from starlette.responses import StreamingResponse

from src.api.deps import get_user
from src.core.vendor import logger
from src.models import User
from src.services.menu import (
    run_ocr,
    process_ocr_results,
    process_image,
    normalize_text_bbox,
    serialize_dish_data,
    get_dish_info_via_openai,
    get_dish_image,
)
from src.test.fixtures import FIXTURES

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
