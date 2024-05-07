import ast
import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
import json
import base64
import cv2
import numpy as np
import asyncio
import httpx

app = FastAPI()
SEARXNG_API_URL = "http://anson-eq.local:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = "http://anson-eq.local:9998/ocr/prediction"


@app.get("/health")
def get_health():
    return status.HTTP_200_OK


class OCRException(Exception):
    status_code = 400
    detail = "Failed to process the image"


class DishInfoException(Exception):
    status_code = 400
    detail = "Failed to search the dish"


def get_ocr_result(
    file_content: bytes,
    timeout: int = 10,
):
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    image = base64.b64encode(file_content).decode("utf8")
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
        raise OCRException()

    ocr_results_str = result["value"][0]
    try:
        ocr_results = ast.literal_eval(ocr_results_str)
        assert isinstance(ocr_results, list)
        assert len(ocr_results) > 0
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError("Failed to parse the OCR results", e.doc, e.pos)
    return (img_height, img_width), ocr_results


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
        raise HTTPException(
            status_code=http_exc.status_code,
            detail=f"Failed to search the dish in async mode: {http_exc.detail}",
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing OCR results",
        )
    for dish_info, item in zip(dish_infos, processed_results):
        bounding_boxes = item[1]
        if "description" not in dish_info:  # failed search
            continue
        dish_info["bounding_box_percentage"] = calculate_bounding_box(
            img_hw, bounding_boxes
        )
        all_dishes_info.append(dish_info)
    return all_dishes_info


def calculate_bounding_box(image_xy: tuple, bounding_box: list) -> dict:
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
    bb = {
        "x": x_percentage,
        "y": y_percentage,
        "w": w_percentage,
        "h": h_percentage,
    }
    return bb


def search_dish_info(dish_name: str) -> dict:
    """
    Search a dish via Searxng on Wikipedia and return the description and image of the dish
        if found in the save search results
    """
    query = {
        "q": f"site:wikipedia.org {dish_name}",
        "format": "json",
    }
    dish_info = {}
    search_results = requests.get(url=SEARXNG_API_URL, params=query, timeout=10)
    if search_results.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to search the dish")
    search_results = search_results.json()
    if "results" not in search_results or len(search_results["results"]) == 0:
        return {}
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
    raise DishInfoException(
        status_code=400, detail="Failed to find results about the dish"
    )


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
    if "pages" not in search_results or len(search_results["pages"]) == 0:
        return {}
    dish_info = {}
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
    return dish_info


@app.post("/v1/menu_text_analysis")
async def ocr_pipeline(file: UploadFile):
    """
    pipeline from image to results:
    uploadFile -> get_ocr_result() -> process_ocr(search dish+calculate bb) -> return results in schema

    """

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    try:
        img_hw, ocr_results = get_ocr_result(file.file.read())
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to OCR the image")
    try:
        processed_results = await process_ocr(img_hw, ocr_results)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process the OCR results")

    return {"results": processed_results, "message": "OK"}


@app.get("/v1/get_dish_info")
async def dish_info_pipeline(dish: str):
    """
    return a dish info from wikipedia search
    results contains description, image(url), and text
    """
    dish_info = await search_dish_info_wiki(dish)

    return {
        "results": dish_info,
        "message": "OK",
    }
