import http

import ujson
from fastapi import APIRouter, Depends, UploadFile, HTTPException

from src.api.deps import get_user
from src.models import User
from src.services.menu import run_ocr
from src.test.fixtures import FIXTURES

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile, user: User = Depends(get_user)):
    if not file or not file.filename:
        raise HTTPException(status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded")
    img_height, img_width, ocr_results = run_ocr(file)
    return {"results": ...}


@router.post("/test")
async def test_upload(file: UploadFile):
    if not file or not file.filename:
        raise HTTPException(status_code=http.HTTPStatus.BAD_REQUEST, detail="No file uploaded")

    with open(FIXTURES, "test1-bbox-results.json", encoding="utf-8") as f:
        return ujson.load(f)
