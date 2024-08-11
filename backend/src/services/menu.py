import ast
import asyncio
from dataclasses import asdict
from typing import Any, List

import cv2
import numpy as np
import requests
import ujson
from httpx import AsyncClient, HTTPStatusError
from postgrest import APIError

from src.core.config import settings
from src.core.vendor import (
    PD_OCR_API_URL,
    WIKI_API_URL,
    chain,
    recommendation_chain,
    logger,
    SupabaseClient,
)
from src.models import Dish
from src.services.exceptions import OCRError
from src.services.utils import duration, BoundingBox, clean_dish_name

MAX_IMAGE_WIDTH = 550
TIMEOUT = 60


@duration
def process_image(image: bytes) -> tuple[bytes, int, int]:
    data = np.frombuffer(image, np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    img_height, img_width, _ = img.shape

    if img_width > MAX_IMAGE_WIDTH:
        scale_ratio = MAX_IMAGE_WIDTH / img_width

        img_width = int(img_width * scale_ratio)
        img_height = int(img_height * scale_ratio)

        img = cv2.resize(img, (img_width, img_height), interpolation=cv2.INTER_AREA)

    # encode and compress image
    encode_param = [
        int(cv2.IMWRITE_JPEG_QUALITY),
        30,
    ]  # compression level (100: no compression)
    _, encimg = cv2.imencode(".jpeg", img, encode_param)
    image = encimg.tobytes()
    return image, img_height, img_width


@duration
def run_ocr_via_pdserving(image: bytes) -> Any:
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    # convert image from bytes and compress image
    data = {"key": ["image"], "value": [image]}
    response = requests.post(
        url=PD_OCR_API_URL, data=ujson.dumps(data), timeout=TIMEOUT
    )
    response.raise_for_status()
    result = response.json()

    if result["err_no"]:
        raise OCRError("Failed to get OCR results")

    ocr_results_str = result["value"][0]
    ocr_results = ast.literal_eval(ocr_results_str)
    if not isinstance(ocr_results, list) or not ocr_results:
        raise OCRError("Failed to parse OCR results")

    return ocr_results


@duration
def run_ocr(image: bytes) -> Any:
    """
    Post uploaded image file content to Azure OCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    headers = {
        "Content-Type": "application/octet-stream",
        "Ocp-Apim-Subscription-Key": settings.AZURE_OCR_API_KEY,
    }
    url = f"{settings.AZURE_OCR_BASE_URL}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read"
    response = requests.post(url=url, headers=headers, data=image, timeout=TIMEOUT)
    response.raise_for_status()
    result = response.json()

    ocr_results = result["readResult"]["blocks"][0]["lines"]

    return ocr_results


async def get_dish_info_via_openai(
    dish_name: str, accept_language: str, model: str = "gpt-3.5-turbo"
) -> dict:
    """Search dish info via OPENAI and using WIKI to get the image"""

    dish: Dish = await chain.ainvoke(
        {"dish_name": dish_name, "accept_language": accept_language}
    )

    return {
        "description": dish.dish_description,
        "text": dish.dish_name,
        "text-translation": dish.dish_translation,
    }


async def get_dish_image_via_wiki(dish_name: str | None) -> str | None:
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


async def retrieve_dish_image(dish_name: str, num_img=10) -> list[str]:
    supabase = await SupabaseClient.get_client()

    response = (
        await supabase.table("dish")
        .select("img_urls")
        .eq("dish_name", dish_name)
        .execute()
    )
    if not response.data or len(response.data) == 0 or not response.data[0]["img_urls"]:
        return None
    urls = response.data[0]["img_urls"]
    return urls[:num_img]


async def cache_dish_image(dish_name: str, image_links: list[str]):
    data = {"dish_name": dish_name, "img_urls": image_links}
    supabase = await SupabaseClient.get_client()
    await supabase.table("dish").insert(data).execute()


async def query_dish_image_via_google(dish_name: str | None) -> List[str] | None:
    if dish_name is None:
        return None

    querystring = {
        "cx": settings.GOOGLE_IMG_SEARCH_CX,
        "searchType": "image",
        "q": dish_name,
        "key": settings.GOOGLE_IMG_SEARCH_KEY,
    }

    async with AsyncClient() as ac:
        response = await ac.get(settings.GOOGLE_IMG_SEARCH_URL, params=querystring)

    response.raise_for_status()
    result = response.json()

    # return None if no items found
    if not result.get("items"):
        return None

    return [item["link"] for item in result.get("items", [])]


@duration
async def get_dish_image(dish_name: str | None, num_img=10) -> List[str] | None:
    """get dish image links from Google search api and cache the results in database"""

    if dish_name is None:
        return None

    normalize_dish_name = dish_name.lower().replace(" ", "_")

    # try to get cached results from database first
    try:
        if cached_results := await retrieve_dish_image(normalize_dish_name, num_img):
            return cached_results
    except APIError:
        logger.error("Error fetching data from Supabase")

    image_links = await query_dish_image_via_google(normalize_dish_name)

    # save the image links to database, may raise exception
    try:
        asyncio.create_task(cache_dish_image(normalize_dish_name, image_links))
    except APIError:
        logger.error("Error inserting data into Supabase")

    return image_links[:num_img] if image_links else None


async def get_dish_data(dish_name: str, accept_language: str) -> dict:
    # regex to clean up dish name
    dish_name = clean_dish_name(dish_name)

    dish = await get_dish_info_via_openai(dish_name, accept_language)
    if dish["text-translation"]:
        dish["text_translation"] = dish["text-translation"]

    try:
        img_src = await get_dish_image(dish.get("text", None))
    except HTTPStatusError:
        img_src = None
    except APIError:
        logger.error("Error in Supabase")
        img_src = None

    return dish | {"img_src": img_src}


async def process_ocr_results(ocr_results: list, accept_language: str) -> list[dict]:
    tasks = []

    for line in ocr_results:
        dish_name = line["text"].strip()
        tasks.append(get_dish_data(dish_name, accept_language))
    return await asyncio.gather(*tasks)


def normalize_text_bbox(img_width, img_height, ocr_results: list):
    texts_bboxes = []
    for line in ocr_results:
        bounding_boxes = line["boundingPolygon"]
        texts_bboxes.append(
            asdict(normalize_bounding_box(img_width, img_height, bounding_boxes))
        )
    return texts_bboxes


def normalize_bounding_box(
    img_width, img_height, bounding_polygon: List[dict]
) -> BoundingBox:
    """
    Calculate the bounding box of the detected text in image
    """
    x_coords = [point["x"] for point in bounding_polygon]
    y_coords = [point["y"] for point in bounding_polygon]

    x_min = min(x_coords)
    x_max = max(x_coords)
    y_min = min(y_coords)
    y_max = max(y_coords)

    x_percentage = x_min / img_width
    y_percentage = y_min / img_height
    w_percentage = (x_max - x_min) / img_width
    h_percentage = (y_max - y_min) / img_height
    return BoundingBox(x=x_percentage, y=y_percentage, w=w_percentage, h=h_percentage)


def serialize_dish_data(dish_data: list, bounding_boxes: list):
    results = []
    for dish_info, dish_bbox in zip(dish_data, bounding_boxes, strict=True):
        dish = {"info": dish_info, "boundingBox": dish_bbox}
        results.append(dish)
    return results


async def recommend_dishes(request) -> dict:
    """Recommend dishes based on the dish names and the language of the dish names"""
    input_data = {
        "dish_names": ", ".join(request.dishes),
        "additional_info": request.additional_info
        or "No additional information provided.",
        "language": request.language,
    }

    output = await recommendation_chain.ainvoke(input_data)
    return output.content
