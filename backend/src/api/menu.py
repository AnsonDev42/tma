import http
from io import BytesIO
from typing import Optional

import cv2
import ujson
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Header
from starlette.responses import StreamingResponse

from src.api.deps import get_user
from src.models import User
from src.services.menu import (
    run_ocr,
    process_ocr_results,
    process_image,
    normalize_text_bbox,
    serialize_dish_data,
    get_dish_info_via_openai,
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


@router.post("/test")
async def test_upload(file: UploadFile):
    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded"
        )

    with open(FIXTURES, "test1-bbox-results.json", encoding="utf-8") as f:
        return ujson.load(f)


@router.get("/get_dish_info")
async def dish_info_pipeline(dish: str):
    """
    for Swift App usage
    return a dish info from wikipedia search
    results contains description, image(url), and text
    """
    dish_info = await get_dish_info_via_openai(dish, "en")
    return {"results": dish_info, "message": "OK"}


@router.post("/draw")
async def draw(file: UploadFile):
    image, img_height, img_width = process_image(file)
    ocr_results = run_ocr(image)
    bounding_boxes = normalize_text_bbox(img_width, img_height, ocr_results)

    for bbox in bounding_boxes:
        x = int(bbox["x"] * img_width / 100)
        y = int(bbox["y"] * img_height / 100)
        w = int(bbox["w"] * img_width / 100)
        h = int(bbox["h"] * img_height / 100)
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 3)

    # Encode the image to be able to return it in HTTP response
    _, buffered = cv2.imencode(".jpg", image)
    return StreamingResponse(BytesIO(buffered), media_type="image/jpeg")
