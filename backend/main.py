import ast
import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
from pydantic import BaseModel
import json
import base64
from rapidocr_onnxruntime import RapidOCR
import cv2
import numpy as np
import asyncio
import httpx

app = FastAPI()
ocr_engine = RapidOCR()
SEARXNG_API_URL = "http://anson-eq.local:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = "http://anson-eq.local:9998/ocr/prediction"


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


def get_ocr_result(
    file_content: bytes,
    timeout: int = 10,
):
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    image = cv2_to_base64(file_content)
    nparr = np.frombuffer(file_content, np.uint8)
    img_height, img_width = cv2.imdecode(nparr, cv2.IMREAD_COLOR).shape[:2]
    data = {"key": ["image"], "value": [image]}
    try:
        r = requests.post(url=PD_OCR_API_URL, data=json.dumps(data), timeout=timeout)
        assert r.status_code == 200
        result = r.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process the image")

    if "err_no" not in result or result["err_no"] != 0 or "value" not in result:
        raise HTTPException(status_code=400, detail="Failed to process the image")

    ocr_results_str = result["value"][0]
    try:
        ocr_results = ast.literal_eval(ocr_results_str)
        return (img_height, img_width), ocr_results
    except json.JSONDecodeError:
        print(f"Failed to parse OCR results: {ocr_results_str}")
        raise HTTPException(status_code=400, detail="Failed to parse OCR results")


async def process_ocr(img_hw, ocr_results: list):
    """
    Process OCR by searching dish_name and return structured results
    """
    processed_results = ocr_results
    all_dishes_info = []
    try:
        tasks = []
        for item in processed_results:
            dish_name = item[0][0]
            tasks.append(search_dish_info_wiki(dish_name))

        dish_infos = await asyncio.gather(*tasks)
    except HTTPException as http_exc:
        print(f"Failed to search the dish in async mode: {http_exc.detail}")
        raise HTTPException(
            status_code=http_exc.status_code,
            detail=f"Failed to search the dish in async mode: {http_exc.detail}",
        )
    except Exception as exc:
        print(f"An unexpected error occurred: {exc}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing OCR results",
        )
    for dish_info, item in zip(dish_infos, processed_results):
        bounding_boxes = item[1]
        if "description" not in dish_info:  # failed search
            continue
        x_percentage, y_percentage, w_percentage, h_percentage = calculate_bounding_box(
            img_hw, bounding_boxes
        )
        dish_info["bounding_box_percentage"] = {
            "x": x_percentage,
            "y": y_percentage,
            "w": w_percentage,
            "h": h_percentage,
        }

        all_dishes_info.append(dish_info)

    return all_dishes_info


def calculate_bounding_box(image_xy: tuple, bounding_box: list) -> tuple:
    """
    Calculate the bounding box of the detected text in image percentage
    """
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = x_min / image_xy[0]
    y_percentage = y_min / image_xy[1]
    w_percentage = (x_max - x_min) / image_xy[0]
    h_percentage = (y_max - y_min) / image_xy[1]
    return x_percentage, y_percentage, w_percentage, h_percentage


def search_dish_info(dish_name: str) -> dict:
    """
    Search a dish via Searxng on Wikipedia and return the description and image of the dish
        if found in the save search results
    """
    query = {
        "q": f"site:wikipedia.org what is {dish_name}",
        "format": "json",
    }
    dish_info = {}
    search_results = requests.get(url=SEARXNG_API_URL, params=query, timeout=10)
    if search_results.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to search the dish")
    search_results = search_results.json()
    if "results" not in search_results or len(search_results["results"]) == 0:
        raise HTTPException(status_code=400, detail="Failed to search the dish")
    for item in search_results["results"]:
        # todo: put into pydantic model to serialize
        if (
            "content" in item
            and item["content"] != ""
            and "img_src" in item
            and item["img_src"] != ""
        ):
            dish_info["description"] = item["content"]
            dish_info["image"] = item["img_src"]
            dish_info["text"] = item["title"]
            return dish_info
    raise HTTPException(status_code=400, detail="Failed to find results about the dish")


async def search_dish_info_wiki(dish_name: str) -> dict:
    """
    Search a dish via Searching on Wikipedia and return the description and image of the dish
    if found in the save search results
    """
    querystring = {"q": dish_name, "format": "json", "limit": "3"}

    async with httpx.AsyncClient() as client:
        response = await client.get(WIKI_API_URL, params=querystring, timeout=3)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to search the dish")
    search_results = response.json()
    dish_info = {}

    if "pages" not in search_results or len(search_results["pages"]) == 0:
        return dish_info

    for item in search_results["pages"]:
        if (
            "title" in item
            and item["title"] != ""
            and "thumbnail" in item
            and item["thumbnail"] is not None
        ):
            dish_info["description"] = item["description"]
            dish_info["image"] = "https:" + item["thumbnail"]["url"]
            dish_info["text"] = item["title"]
            return dish_info

    raise HTTPException(status_code=400, detail="Failed to find results about the dish")


@app.post("/v1/ocr")
async def ocr_pipeline(file: UploadFile):
    """
    pipeline from image to results:
    uploadFile -> get_ocr_result() -> process_ocr(search dish+calculate bb) -> return results in schema

    """

    if not file or not file.filename:
        return {"message": "No file uploaded"}

    img_hw, ocr_results = get_ocr_result(file.file.read())

    print(f"img_hw: {img_hw}, ocr_results: {ocr_results}")
    try:
        processed_results = await process_ocr(img_hw, ocr_results)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Failed to process the image")

    # processed_results = process_ocr(img_hw, ocr_results)

    return {"results": processed_results, "message": "OK"}
