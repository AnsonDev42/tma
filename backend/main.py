import ast
import http
from typing import NamedTuple

import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
import json
import base64
import cv2
import numpy as np
import asyncio
import httpx
from dataclasses import dataclass, asdict

SEARXNG_API_URL = "http://anson-eq.local:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = "http://anson-eq.local:9998/ocr/prediction"
TIMEOUT = 10

app = FastAPI()


@dataclass
class BoundingBox:
    """Bounding box for detected text in image in percentage"""

    x: float
    y: float
    w: float
    h: float


class Dimensions(NamedTuple):
    """Image dimensions"""

    width: int
    height: int


@app.get("/")
def root():
    return status.HTTP_200_OK


class OCRError(Exception):
    pass


class DishSearchError(Exception):
    pass


def get_ocr_result(file_content: bytes):
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    image = base64.b64encode(file_content).decode("utf8")
    nparr = np.frombuffer(file_content, np.uint8)
    img_height, img_width = cv2.imdecode(nparr, cv2.IMREAD_COLOR).shape[:2]
    data = {"key": ["image"], "value": [image]}
    response = requests.post(url=PD_OCR_API_URL, data=json.dumps(data), timeout=TIMEOUT)
    response.raise_for_status()
    result = response.json()

    if result["err_no"] != 0:
        raise OCRError("Failed to get OCR results")

    ocr_results_str = result["value"][0]
    ocr_results = ast.literal_eval(ocr_results_str)
    if not isinstance(ocr_results, list) or not ocr_results:
        raise OCRError("OCR results is not a list")
    return Dimensions(img_width, img_height), ocr_results


async def search_dishes_info(ocr_results: list):
    tasks = []

    for item in ocr_results:
        dish_name, _ = item[0]
        tasks.append(search_dish_info_via_wiki(dish_name))

    search_results = await asyncio.gather(*tasks)
    return search_results


def normalize_text_bbox(img_hw, ocr_results: list):
    texts_bboxes = []
    for item in ocr_results:
        bounding_boxes = item[1]
        texts_bboxes.append(asdict(normalize_bounding_box(img_hw, bounding_boxes)))
    return texts_bboxes


def aggregate_dishes_info_and_bbox(dish_infos: list, dishes_bboxes: list):
    for dish_info, dish_bbox in zip(dish_infos, dishes_bboxes):
        dish_info["bounding_box"] = dish_bbox
    return dish_infos


def normalize_bounding_box(image_xy: tuple, bounding_box: list) -> BoundingBox:
    """
    Calculate the bounding box of the detected text in image percentage
    """
    assert image_xy[0] > 0 and image_xy[1] > 0, "Invalid image dimension"
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = x_min / image_xy[0]
    y_percentage = y_min / image_xy[1]
    w_percentage = (x_max - x_min) / image_xy[0]
    h_percentage = (y_max - y_min) / image_xy[1]

    return BoundingBox(x=x_percentage, y=y_percentage, w=w_percentage, h=h_percentage)


def search_dish_info_via_searxng(dish_name: str) -> dict:
    """
    Search a dish via Searxng on Wikipedia and return the description and image of the dish
        if found in the save search results
    """
    query = {"q": f"site:wikipedia.org {dish_name}", "format": "json"}
    response = requests.get(url=SEARXNG_API_URL, params=query, timeout=TIMEOUT)
    response.raise_for_status()
    search_results = response.json()
    if "results" not in search_results or len(search_results["results"]) == 0:
        return {"description": None, "image": None, "text": None}
    for item in search_results["results"]:
        # todo: put into pydantic model to serialize
        if (
            "content" in item
            and item["content"] != ""
            and "img_src" in item
            and item["img_src"] != ""
        ):
            return {
                "description": item["content"],
                "image": item["img_src"],
                "text": item["title"],
            }
    return {"description": None, "image": None, "text": None}


async def search_dish_info_via_wiki(dish_name: str) -> dict:
    """
    Search a dish via Searching on Wikipedia and return the description and image of the dish
    if found in the save search results
    """
    query = {"q": dish_name, "format": "json", "limit": "3"}

    async with httpx.AsyncClient() as client:
        response = await client.get(WIKI_API_URL, params=query, timeout=TIMEOUT)
    response.raise_for_status()
    search_results = response.json()
    if "pages" not in search_results or len(search_results["pages"]) == 0:
        return {"description": None, "image": None, "text": None}
    for item in search_results["pages"]:
        if (
            "title" in item
            and item["title"] != ""
            and "thumbnail" in item
            and item["thumbnail"] is not None
        ):
            dish_info = {
                "description": item["description"],
                "image": "https:" + item["thumbnail"]["url"],
                "text": item["title"],
            }
            return dish_info
    return {"description": None, "image": None, "text": None}


@app.post("/upload")
async def upload(file: UploadFile):
    """
    pipeline from image to results:
    1. get OCR results
    2. search dish info
    3. calculate bounding box in percentage
    4. aggregate results
    """

    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.NO_CONTENT.value, detail="No file uploaded"
        )
    img_hw, ocr_results = get_ocr_result(file.file.read())
    dishes_info = await search_dishes_info(ocr_results)
    texts_bboxes = normalize_text_bbox(img_hw, ocr_results)
    return aggregate_dishes_info_and_bbox(dishes_info, texts_bboxes)


@app.get("/get_dish_info")
async def dish_info_pipeline(dish: str):
    """
    for Swift App usage
    return a dish info from wikipedia search
    results contains description, image(url), and text
    """
    dish_info = await search_dish_info_via_wiki(dish)

    return {"results": dish_info, "message": "OK"}
