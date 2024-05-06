import ast

import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
from pydantic import BaseModel
import json
import base64
from rapidocr_onnxruntime import RapidOCR
import cv2
import numpy as np

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


def get_ocr_result(
    file_content: bytes,
    url: str = "http://anson-eq.local:9998/ocr/prediction",
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
        r = requests.post(url=url, data=json.dumps(data), timeout=timeout)
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


def process_ocr(img_hw, ocr_results: list):
    """
    Process OCR by searching dish_name and return structured results

    """
    processed_results = ocr_results
    # processed_results = [
    #     [
    #         ["FATTO TIRAMISU-7", 0.9470489],
    #         [[1181, 728], [1870, 748], [1870, 819], [1181, 799]],
    #     ],
    #     [
    #         ["Coffee liqueur-soaked sponge, mascarpone, chocolate", 0.9988693],
    #         [[681, 811], [2358, 858], [2358, 948], [681, 901]],
    #     ],
    # ]
    all_dishes_info = []
    for item in processed_results[:2]:
        dish_name = item[0][0]
        confidence = item[0][1]
        bounding_boxes = item[1]
        print(dish_name, confidence, bounding_boxes)
        dish_info = search_dish_info(dish_name)
        x_percentage, y_percentage, w_percentage, h_percentage = calculate_bounding_box(
            img_hw, bounding_boxes
        )
        print(dish_info)
        dish_info["bounding_box"] = {
            "x": x_percentage,
            "y": y_percentage,
            "w": w_percentage,
            "h": h_percentage,
        }
        all_dishes_info.append(dish_info)
        print("---" * 10)

    return all_dishes_info


def calculate_bounding_box(image_xy: tuple, bounding_box: list) -> tuple:
    """
    Calculate the bounding box of the detected text in image percentage
    """
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = (x_min / image_xy[0], x_max / image_xy[0])
    y_percentage = (y_min / image_xy[1], y_max / image_xy[1])
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
    url = "http://anson-eq.local:8081/"
    dish_info = {}
    search_results = requests.get(url=url, params=query, timeout=10)
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


@app.get("/test")
async def test():
    # res = search_dish("masala chicken")
    res = process_ocr([])
    return {"message": "OK", "results": res}


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
    processed_results = process_ocr(img_hw, ocr_results)

    return {"results": processed_results, "message": "OK"}
