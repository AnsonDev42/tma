import ast
import asyncio
import base64
from dataclasses import asdict
from typing import Any

import cv2
import numpy as np
import requests
import ujson
from httpx import AsyncClient

from src.core.vendor import PD_OCR_API_URL, client, WIKI_API_URL
from src.services.exceptions import OCRError
from src.services.utils import duration, PROMPT, BoundingBox

MAX_IMAGE_WIDTH = 550
TIMEOUT = 60


@duration
def process_image(image: bytes) -> tuple[str, int, int]:
    data = np.frombuffer(image, np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    img_height, img_width, _ = img.shape

    if img_width > MAX_IMAGE_WIDTH:
        scale_ratio = MAX_IMAGE_WIDTH / img_width

        img_width = int(img_width * scale_ratio)
        img_height = int(img_height * scale_ratio)

        img = cv2.resize(img, (img_width, img_height), interpolation=cv2.INTER_AREA)

    # encode and compress image
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 30]  # compression level (100: no compression)
    _, encimg = cv2.imencode('.jpeg', img, encode_param)
    image = base64.b64encode(encimg).decode("utf8")
    return image, img_height, img_width


@duration
def run_ocr(image: bytes) -> Any:
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    # convert image from bytes and compress image
    data = {"key": ["image"], "value": [image]}
    response = requests.post(url=PD_OCR_API_URL, data=ujson.dumps(data), timeout=TIMEOUT)
    response.raise_for_status()
    result = response.json()

    if result["err_no"]:
        raise OCRError("Failed to get OCR results")

    ocr_results_str = result["value"][0]
    ocr_results = ast.literal_eval(ocr_results_str)
    if not isinstance(ocr_results, list) or not ocr_results:
        raise OCRError("Failed to parse OCR results")

    return ocr_results


async def get_dish_info_via_openai(dish_name: str, accept_language: str) -> dict:
    """Search dish info via OPENAI and using WIKI to get the image"""
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": PROMPT.format(accept_language)},
            {"role": "user", "content": f"OCR result: '{dish_name}'"},
        ],
    )
    content = ujson.loads(response.choices[0].message.content)
    return {"description": content["dish-description"], "text": content["dish-name"]}


async def get_dish_image(dish_name: str | None) -> str | None:
    if dish_name is None:
        return None

    query = {"q": dish_name, "format": "json", "limit": "3"}
    async with AsyncClient() as ac:
        response = await ac.get(WIKI_API_URL, params=query)
    response.raise_for_status()
    result = response.json()

    for item in result.get("pages", []):
        thumbnail = item.get("thumbnail")
        if thumbnail and "url" in thumbnail:
            return f"https:{thumbnail['url']}"
    return None


def get_dish_data(dish_name: str, accept_language: str) -> dict:
    data = get_dish_info_via_openai(dish_name, accept_language)
    img_src = get_dish_image(data)
    return data | {"img_src": img_src}


async def process_ocr_results(ocr_results: list) -> list[dict]:
    tasks = []
    for item in ocr_results:
        dish_name, _ = item[0]
        tasks.append(get_dish_data(dish_name, "en"))
    return await asyncio.gather(*tasks)


def normalize_text_bbox(img_width, img_height, ocr_results: list):
    texts_bboxes = []
    for item in ocr_results:
        bounding_boxes = item[1]
        texts_bboxes.append(
            asdict(normalize_bounding_box(img_width, img_height, bounding_boxes))
        )
    return texts_bboxes


def normalize_bounding_box(
        img_width, img_height, bounding_box: list
) -> BoundingBox:
    """
    Calculate the bounding box of the detected text in image
    """
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = x_min / img_width
    y_percentage = y_min / img_height
    w_percentage = (x_max - x_min) / img_width
    h_percentage = (y_max - y_min) / img_height

    return BoundingBox(x=x_percentage, y=y_percentage, w=w_percentage, h=h_percentage)


def serialize_dish_data(dish_data: list, bounding_boxes: list):
    results = []
    for dish_info, dish_bbox in zip(dish_data, bounding_boxes, strict=True):
        dish = { "info": dish_info, "boundingBox": dish_bbox }
        results.append(dish)
    return results
