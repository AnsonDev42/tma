import ast

import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
from pydantic import BaseModel
import json
import base64
from rapidocr_onnxruntime import RapidOCR

app = FastAPI()
ocr_engine = RapidOCR()


class HealthCheck(BaseModel):
    """Response model to validate and return when performing a health check."""

    status: str = "OK"


@app.get(
    "/health",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,
)
def get_health() -> HealthCheck:
    return HealthCheck(status="OK")


@app.get("/")
async def root():
    return {"message": "Hello World"}


def cv2_to_base64(image):
    return base64.b64encode(image).decode("utf8")


def process_ocr_result(
    file_content: bytes,
    url: str = "http://anson-eq.local:9998/ocr/prediction",
    timeout: int = 10,
):
    """
    Post uploaded image file content to pdOCR server and return OCR results in json format

    """
    image = cv2_to_base64(file_content)
    data = {"key": ["image"], "value": [image]}
    try:
        r = requests.post(url=url, data=json.dumps(data), timeout=timeout)
        result = r.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process the image")

    if "err_no" not in result or result["err_no"] != 0 or "value" not in result:
        raise HTTPException(status_code=400, detail="Failed to process the image")

    ocr_results_str = result["value"][0]
    try:
        ocr_results = ast.literal_eval(ocr_results_str)
        return ocr_results
    except json.JSONDecodeError:
        print(f"Failed to parse OCR results: {ocr_results_str}")
        raise HTTPException(status_code=400, detail="Failed to parse OCR results")


@app.post("/v1/ocr")
async def ocr(file: UploadFile):
    if not file or not file.filename:
        return {"message": "No file uploaded"}

    ocr_results = process_ocr_result(file.file.read())
    return {"results": ocr_results, "message": "OK"}
