import asyncio
import base64
import datetime
import time
from asyncio import gather
from dataclasses import asdict
from typing import Any

import cv2
import numpy as np
from httpx import AsyncClient, HTTPStatusError
from postgrest import APIError

from src.core.config import settings
from src.core.vendors.supabase.client import SupabaseClient
from src.core.vendors.utilities.client import chain, logger, recommendation_chain
from src.models import Dish
from src.services.exceptions import OCRError
from src.services.ocr.build_paragraph import build_paragraph, translate
from src.services.utils import BoundingBox, clean_dish_name, duration

MAX_IMAGE_WIDTH = 2000
MAX_IMAGE_SIZE = 4 * 1024 * 1024 - 100  # 4MB
HTTP_TIMEOUT_SECONDS = 60
DIP_RESULT_POLL_INTERVAL_SECONDS = 0.5
DIP_RESULT_TIMEOUT_SECONDS = 6


def _resolve_language(accept_language: str | None) -> str:
    if not accept_language:
        return "en"
    language = accept_language.split(",")[0].strip()
    return language or "en"


@duration
def process_image(image: bytes) -> tuple[bytes, int, int]:
    data = np.frombuffer(image, np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        raise OCRError("Invalid image")

    img_height, img_width, _ = img.shape

    if img_width > MAX_IMAGE_WIDTH:
        scale_ratio = MAX_IMAGE_WIDTH / img_width
        img_width = int(img_width * scale_ratio)
        img_height = int(img_height * scale_ratio)
        img = cv2.resize(img, (img_width, img_height), interpolation=cv2.INTER_AREA)

    quality = 80
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, encoded_image = cv2.imencode(".jpeg", img, encode_param)

    while encoded_image.nbytes > MAX_IMAGE_SIZE:
        quality -= 15
        if quality <= 5:
            break
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, encoded_image = cv2.imencode(".jpeg", img, encode_param)

    return encoded_image.tobytes(), img_height, img_width


@duration
async def post_dip_request(image: bytes) -> str:
    headers = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.AZURE_DIP_API_KEY,
    }
    url = (
        f"{settings.AZURE_DIP_BASE_URL}/documentintelligence/documentModels"
        "/prebuilt-read:analyze?api-version=2024-02-29-preview"
    )
    payload = {"base64Source": base64.b64encode(image).decode("utf-8")}

    async with AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = await client.post(url, json=payload, headers=headers)

    response.raise_for_status()
    operation_location = response.headers.get("Operation-Location")
    if not operation_location:
        raise OCRError("DIP response does not include operation location")
    return operation_location


async def retrieve_dip_results(
    retrieve_url: str, timeout: int = DIP_RESULT_TIMEOUT_SECONDS
) -> dict[str, Any] | None:
    headers = {
        "Ocp-Apim-Subscription-Key": settings.AZURE_DIP_API_KEY,
        "content-type": "application/json",
    }

    start_time = time.monotonic()
    async with AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        while True:
            response = await client.get(retrieve_url, headers=headers)
            response.raise_for_status()
            result = response.json()

            status = str(result.get("status", "")).lower()
            if status == "succeeded":
                return result
            if status not in {"running", "notstarted"}:
                return None
            if time.monotonic() - start_time > timeout:
                return None

            await asyncio.sleep(DIP_RESULT_POLL_INTERVAL_SECONDS)


@duration
async def get_dish_info_via_openai(dish_name: str, accept_language: str) -> dict[str, Any]:
    try:
        dish: Dish = await chain.ainvoke(
            {"dish_name": dish_name, "accept_language": accept_language}
        )
    except Exception as exc:  # defensive catch for LLM/provider failures
        logger.error(exc)
        dish = Dish(dish_name="Unknown")

    return {
        "description": dish.dish_description,
        "text": dish.dish_name,
        "text_translation": dish.dish_translation,
    }


async def retrieve_dish_image(dish_name: str, num_img: int = 10) -> list[str] | None:
    supabase = await SupabaseClient.get_client()

    response = (
        await supabase.table("dish")
        .select("img_urls")
        .eq("dish_name", dish_name)
        .execute()
    )

    if not response.data or not response.data[0].get("img_urls"):
        return None

    urls = response.data[0]["img_urls"]
    return urls[:num_img]


async def cache_dish_image(dish_name: str, image_links: list[str]):
    data = {"dish_name": dish_name, "img_urls": image_links}
    supabase = await SupabaseClient.get_client()

    existing_record = (
        await supabase.table("dish").select("*").eq("dish_name", dish_name).execute()
    )

    if not existing_record.data:
        await supabase.table("dish").insert(data).execute()
        return "build cache"

    now = datetime.datetime.now(datetime.UTC)
    created_at = datetime.datetime.fromisoformat(existing_record.data[0]["created_at"])
    if (now - created_at) > datetime.timedelta(days=3):
        await (
            supabase.table("dish")
            .update({"img_urls": image_links})
            .eq("dish_name", dish_name)
            .execute()
        )
        return "update cache"

    return "no cache"


async def query_dish_image_via_google(dish_name: str | None) -> list[str] | None:
    if dish_name is None:
        return None

    querystring = {
        "cx": settings.GOOGLE_IMG_SEARCH_CX,
        "searchType": "image",
        "q": dish_name,
        "key": settings.GOOGLE_IMG_SEARCH_KEY,
    }

    async with AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = await client.get(settings.GOOGLE_IMG_SEARCH_URL, params=querystring)

    response.raise_for_status()
    result = response.json()

    if not result.get("items"):
        return None

    return [item["link"] for item in result.get("items", [])]


async def get_dish_image(
    dish_name: str | None,
    num_img: int = 10,
    *,
    enable_cache: bool = False,
) -> list[str] | None:
    if dish_name is None:
        return None

    normalized_dish_name = dish_name.lower().replace(" ", "_")

    if enable_cache:
        try:
            if cached_results := await retrieve_dish_image(normalized_dish_name, num_img):
                return cached_results
        except APIError:
            logger.error("Error fetching dish image cache from Supabase")

    image_links = await query_dish_image_via_google(normalized_dish_name)

    if enable_cache and image_links:
        try:
            asyncio.create_task(cache_dish_image(normalized_dish_name, image_links))
        except APIError:
            logger.error("Error writing dish image cache to Supabase")

    return image_links[:num_img] if image_links else None


@duration
async def get_dish_data(dish_name: str, accept_language: str) -> dict[str, Any]:
    cleaned_name = clean_dish_name(dish_name)
    if not cleaned_name:
        return {
            "description": None,
            "text": "Unknown",
            "text_translation": None,
            "img_src": None,
        }

    dish = await get_dish_info_via_openai(cleaned_name, accept_language)

    try:
        if dish.get("text") == "Unknown":
            raise OCRError("Unknown dish name")
        img_src = await get_dish_image(dish.get("text"), 10, enable_cache=True)
    except (HTTPStatusError, OCRError, APIError):
        img_src = None

    return dish | {"img_src": img_src}


async def get_paragraph_data(dish_name: str, accept_language: str) -> dict[str, Any]:
    paragraph_translation = translate(dish_name, accept_language)
    return {
        "description": paragraph_translation,
        "text": paragraph_translation,
        "text_translation": paragraph_translation,
        "img_src": None,
    }


def normalize_bounding_box(
    img_width: int,
    img_height: int,
    azure_dip_polygon: dict | None = None,
) -> BoundingBox:
    if not azure_dip_polygon:
        raise OCRError("Missing DIP polygon for bounding box normalization")

    x_coords = azure_dip_polygon["x_coords"]
    y_coords = azure_dip_polygon["y_coords"]

    x_min = min(x_coords)
    x_max = max(x_coords)
    y_min = min(y_coords)
    y_max = max(y_coords)

    return BoundingBox(
        x=x_min / img_width,
        y=y_min / img_height,
        w=(x_max - x_min) / img_width,
        h=(y_max - y_min) / img_height,
    )


def normalize_text_bbox_dip(img_width: int, img_height: int, ocr_results: list[dict]):
    texts_bboxes = []
    for line in ocr_results:
        texts_bboxes.append(
            asdict(
                normalize_bounding_box(
                    img_width,
                    img_height,
                    azure_dip_polygon=line["polygon"],
                )
            )
        )
    return texts_bboxes


def serialize_dish_data_filtered(dish_data: list[dict], bounding_boxes: list[dict]):
    results = []
    item_id = 0

    for dish_info, dish_bbox in zip(dish_data, bounding_boxes, strict=True):
        if dish_info.get("text", "").strip().lower() == "unknown":
            continue
        results.append({"id": item_id, "info": dish_info, "boundingBox": dish_bbox})
        item_id += 1

    return results


async def recommend_dishes(request) -> str:
    input_data = {
        "dish_names": ", ".join(request.dishes),
        "additional_info": request.additional_info
        or "No additional information provided.",
        "language": request.language,
    }

    output = await recommendation_chain.ainvoke(input_data)
    return output.content


def format_polygon(polygon: list[float]) -> dict[str, list[float]]:
    return {"x_coords": polygon[::2], "y_coords": polygon[1::2]}


def format_dip_lines_polygon(dip_results: list[dict]) -> list[dict]:
    for line in dip_results:
        line["polygon"] = format_polygon(line["polygon"])
    return dip_results


def filter_dip_lines(dip_results: list[dict]) -> list[dict]:
    cleaned = []
    for line in dip_results:
        content = line["content"].strip()
        if content.lower() == "unknown":
            continue

        normalized = content.replace(".", "").replace(",", "").replace(" ", "")
        if normalized.isdigit():
            continue

        cleaned.append(line)
    return cleaned


@duration
async def run_dip(image: bytes) -> list[dict]:
    retrieve_url = await post_dip_request(image)
    results = await retrieve_dip_results(retrieve_url)
    if not results:
        logger.error("No DIP results retrieved from Azure Document Intelligence")
        raise OCRError("DIP failed")

    dip_line_results = results["analyzeResult"]["pages"][0]["lines"]
    dip_line_results = filter_dip_lines(dip_line_results)
    return format_dip_lines_polygon(dip_line_results)


@duration
async def process_dip_results(dip_results: list[dict], accept_language: str) -> list[dict]:
    tasks = [get_dish_data(line["content"], accept_language) for line in dip_results]
    return await asyncio.gather(*tasks)


@duration
async def process_dip_paragraph_results(
    dip_results: list[dict], accept_language: str
) -> list[dict]:
    tasks = [get_paragraph_data(line["content"], accept_language) for line in dip_results]
    return await asyncio.gather(*tasks)


@duration
async def upload_pipeline_with_dip_auto_group_lines(
    image: bytes,
    img_height: int,
    img_width: int,
    accept_language: str | None,
) -> dict[str, list[dict]]:
    language = _resolve_language(accept_language)
    dip_results_in_lines = await run_dip(image)
    paragraphs, individual_lines = build_paragraph(dip_results_in_lines)

    dish_info_task = process_dip_results(individual_lines, language)
    dish_description_task = process_dip_paragraph_results(paragraphs, language)
    dish_info, dish_description = await gather(dish_info_task, dish_description_task)

    dish_info_bounding_box = normalize_text_bbox_dip(img_width, img_height, individual_lines)
    dish_description_bounding_box = normalize_text_bbox_dip(img_width, img_height, paragraphs)

    dish_info.extend(dish_description)
    dish_info_bounding_box.extend(dish_description_bounding_box)

    return {"results": serialize_dish_data_filtered(dish_info, dish_info_bounding_box)}


async def analyze_menu_image(image: bytes, accept_language: str | None) -> dict[str, list[dict]]:
    processed_image, img_height, img_width = process_image(image)
    return await upload_pipeline_with_dip_auto_group_lines(
        processed_image, img_height, img_width, accept_language
    )
