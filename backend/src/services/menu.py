import asyncio
import base64
import datetime
import re
import time
from dataclasses import asdict
from typing import Any, Awaitable

import cv2
import numpy as np
from httpx import AsyncClient, HTTPStatusError
from postgrest import APIError

from src.core.config import settings
from src.core.vendors.supabase.client import SupabaseClient
from src.core.vendors.utilities.client import chain, logger, recommendation_chain
from src.models import Dish
from src.services.exceptions import OCRError
from src.services.ocr.layout_grouping_experiment import (
    build_paragraph_layout_experiment,
    wash_layout_lines,
)
from src.services.ocr.build_paragraph import build_paragraph, translate
from src.services.utils import BoundingBox, clean_dish_name, duration

MAX_IMAGE_WIDTH = 2000
MAX_IMAGE_SIZE = 4 * 1024 * 1024 - 100  # 4MB
HTTP_TIMEOUT_SECONDS = 60
DIP_RESULT_POLL_INTERVAL_SECONDS = 0.5
DIP_RESULT_TIMEOUT_SECONDS = 6

PRICE_NUMBER_PATTERN = r"(?:\d{1,3}(?:[.,]\d{3})+|\d{1,4})(?:[.,]\d{1,2})?"
PRICE_ONLY_PATTERN = re.compile(
    rf"^\s*(?:[$€£¥]\s*)?{PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?\s*$",
    re.IGNORECASE,
)
TRAILING_PRICE_CAPTURE_PATTERN = re.compile(
    rf"(?:[-–—:]\s*)?((?:[$€£¥]\s*)?{PRICE_NUMBER_PATTERN}(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?)\s*$",
    re.IGNORECASE,
)


def _resolve_language(accept_language: str | None) -> str:
    if not accept_language:
        return "en"
    language = accept_language.split(",")[0].strip()
    return language or "en"


def _unknown_dish_result() -> dict[str, Any]:
    return {
        "description": None,
        "text": "Unknown",
        "text_translation": None,
        "img_src": None,
    }


def _extract_price_token(text: str) -> str | None:
    stripped = text.strip()
    if not stripped:
        return None
    if PRICE_ONLY_PATTERN.fullmatch(stripped):
        return stripped
    trailing = TRAILING_PRICE_CAPTURE_PATTERN.search(stripped)
    if trailing is None:
        return None
    token = trailing.group(1).strip()
    return token or None


def _bbox_center(box: dict[str, float]) -> tuple[float, float]:
    return box["x"] + box["w"] / 2.0, box["y"] + box["h"] / 2.0


def _bbox_union(a: dict[str, float], b: dict[str, float]) -> dict[str, float]:
    x_min = min(a["x"], b["x"])
    y_min = min(a["y"], b["y"])
    x_max = max(a["x"] + a["w"], b["x"] + b["w"])
    y_max = max(a["y"] + a["h"], b["y"] + b["h"])
    return {
        "x": x_min,
        "y": y_min,
        "w": max(0.0, x_max - x_min),
        "h": max(0.0, y_max - y_min),
    }


def _horizontal_overlap_ratio(a: dict[str, float], b: dict[str, float]) -> float:
    overlap_left = max(a["x"], b["x"])
    overlap_right = min(a["x"] + a["w"], b["x"] + b["w"])
    overlap = max(0.0, overlap_right - overlap_left)
    base = max(1e-6, min(a["w"], b["w"]))
    return overlap / base


def _select_best_dish_index_for_paragraph(
    dish_boxes: list[dict[str, float]],
    paragraph_box: dict[str, float],
) -> int | None:
    if not dish_boxes:
        return None

    paragraph_center_x, paragraph_center_y = _bbox_center(paragraph_box)
    best_idx: int | None = None
    best_score = float("inf")
    for idx, dish_box in enumerate(dish_boxes):
        dish_center_x, dish_center_y = _bbox_center(dish_box)
        vertical_delta = paragraph_center_y - dish_center_y
        horizontal_distance = abs(paragraph_center_x - dish_center_x)
        overlap_ratio = _horizontal_overlap_ratio(dish_box, paragraph_box)
        score = (
            abs(vertical_delta) * 1.8
            + horizontal_distance * 0.9
            + (1.0 - overlap_ratio) * 0.6
        )
        if vertical_delta < -0.04:
            score += 0.7
        if vertical_delta > 0.35:
            score += 0.9
        if score < best_score:
            best_score = score
            best_idx = idx

    return best_idx if best_score < 2.0 else None


def _select_best_dish_index_for_price(
    dish_boxes: list[dict[str, float]],
    price_box: dict[str, float],
) -> int | None:
    if not dish_boxes:
        return None

    price_center_x, price_center_y = _bbox_center(price_box)
    best_idx: int | None = None
    best_score = float("inf")
    for idx, dish_box in enumerate(dish_boxes):
        dish_center_x, dish_center_y = _bbox_center(dish_box)
        vertical_distance = abs(price_center_y - dish_center_y)
        horizontal_distance = abs(price_center_x - dish_center_x)
        score = vertical_distance * 3.0 + horizontal_distance * 0.8
        if price_center_x < dish_center_x:
            score += 0.4
        if vertical_distance > 0.18:
            score += 1.0
        if score < best_score:
            best_score = score
            best_idx = idx

    return best_idx if best_score < 1.6 else None


def merge_grouped_context_into_dishes(
    dish_info: list[dict[str, Any]],
    dish_boxes: list[dict[str, float]],
    paragraph_info: list[dict[str, Any]],
    paragraph_boxes: list[dict[str, float]],
    *,
    price_lines: list[dict] | None = None,
    price_boxes: list[dict[str, float]] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, float]]]:
    if len(dish_info) != len(dish_boxes):
        aligned_length = min(len(dish_info), len(dish_boxes))
        logger.warning(
            "Dish info/box length mismatch; truncating to {} (info={}, boxes={})",
            aligned_length,
            len(dish_info),
            len(dish_boxes),
        )
        dish_info = dish_info[:aligned_length]
        dish_boxes = dish_boxes[:aligned_length]

    merged_info = [dict(item) for item in dish_info]
    merged_boxes = [dict(box) for box in dish_boxes]
    if not merged_info:
        return merged_info, merged_boxes

    paragraph_assignments = 0
    for paragraph_meta, paragraph_box in zip(paragraph_info, paragraph_boxes, strict=False):
        paragraph_text = str(
            paragraph_meta.get("description")
            or paragraph_meta.get("text_translation")
            or paragraph_meta.get("text")
            or ""
        ).strip()
        if not paragraph_text:
            continue

        best_dish_idx = _select_best_dish_index_for_paragraph(merged_boxes, paragraph_box)
        if best_dish_idx is None:
            continue

        existing_description = str(merged_info[best_dish_idx].get("description") or "").strip()
        if paragraph_text.casefold() not in existing_description.casefold():
            if existing_description:
                merged_info[best_dish_idx]["description"] = (
                    f"{existing_description} {paragraph_text}"
                )
            else:
                merged_info[best_dish_idx]["description"] = paragraph_text
        merged_boxes[best_dish_idx] = _bbox_union(merged_boxes[best_dish_idx], paragraph_box)
        paragraph_assignments += 1

    price_assignments = 0
    if price_lines and price_boxes:
        for line, price_box in zip(price_lines, price_boxes, strict=False):
            price_token = _extract_price_token(str(line.get("content", "")))
            if not price_token:
                continue

            best_dish_idx = _select_best_dish_index_for_price(merged_boxes, price_box)
            if best_dish_idx is None:
                continue

            existing_price = str(merged_info[best_dish_idx].get("price") or "").strip()
            if not existing_price:
                merged_info[best_dish_idx]["price"] = price_token
            elif price_token.casefold() not in existing_price.casefold():
                merged_info[best_dish_idx]["price"] = f"{existing_price} / {price_token}"
            merged_boxes[best_dish_idx] = _bbox_union(merged_boxes[best_dish_idx], price_box)
            price_assignments += 1

    logger.info(
        "Grouped context merge paragraphs={} paragraphAssignments={} prices={} priceAssignments={}",
        len(paragraph_info),
        paragraph_assignments,
        len(price_lines or []),
        price_assignments,
    )
    return merged_info, merged_boxes


async def _gather_with_limit(
    coroutines: list[Awaitable[Any]],
    concurrency_limit: int,
) -> list[Any]:
    if not coroutines:
        return []

    semaphore = asyncio.Semaphore(max(1, concurrency_limit))

    async def _run(coroutine: Awaitable[Any]) -> Any:
        async with semaphore:
            return await coroutine

    return await asyncio.gather(*[_run(coroutine) for coroutine in coroutines])


def _resolve_fanout_concurrency(task_count: int) -> int:
    base_limit = max(1, settings.MENU_DISH_FANOUT_CONCURRENCY)
    max_limit = max(base_limit, settings.MENU_DISH_FANOUT_MAX_CONCURRENCY)

    if task_count <= 0:
        return base_limit
    if not settings.MENU_DISH_FANOUT_ADAPTIVE:
        return base_limit

    return min(max_limit, max(base_limit, task_count))


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
        "/prebuilt-read:analyze?api-version=2024-11-30"
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
async def get_dish_data(
    dish_name: str,
    accept_language: str,
    *,
    include_images: bool = True,
) -> dict[str, Any]:
    cleaned_name = clean_dish_name(dish_name)
    if not cleaned_name:
        return _unknown_dish_result()

    dish = await get_dish_info_via_openai(cleaned_name, accept_language)

    img_src = None
    if include_images:
        try:
            if dish.get("text") == "Unknown":
                raise OCRError("Unknown dish name")
            img_src = await get_dish_image(dish.get("text"), 10, enable_cache=True)
        except (HTTPStatusError, OCRError, APIError):
            img_src = None

    return dish | {"img_src": img_src}


async def get_paragraph_data(dish_name: str, accept_language: str) -> dict[str, Any]:
    paragraph_translation = await translate(dish_name, accept_language)
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


def filter_dip_lines(
    dip_results: list[dict],
    *,
    remove_unknown: bool = True,
    remove_numeric_only: bool = True,
) -> list[dict]:
    cleaned = []
    for line in dip_results:
        content = str(line.get("content", "")).strip()
        if not content:
            continue
        if remove_unknown and content.lower() == "unknown":
            continue

        normalized = content.replace(".", "").replace(",", "").replace(" ", "")
        if remove_numeric_only and normalized.isdigit():
            continue

        cleaned.append(line)
    return cleaned


@duration
async def run_dip(image: bytes, *, preserve_raw_lines: bool = False) -> list[dict]:
    retrieve_url = await post_dip_request(image)
    results = await retrieve_dip_results(retrieve_url)
    if not results:
        logger.error("No DIP results retrieved from Azure Document Intelligence")
        raise OCRError("DIP failed")

    dip_line_results = results["analyzeResult"]["pages"][0]["lines"]
    dip_line_results = filter_dip_lines(
        dip_line_results,
        remove_unknown=not preserve_raw_lines,
        remove_numeric_only=not preserve_raw_lines,
    )
    return format_dip_lines_polygon(dip_line_results)


@duration
async def process_dip_results(dip_results: list[dict], accept_language: str) -> list[dict]:
    if not dip_results:
        return []

    include_images = len(dip_results) <= settings.MENU_IMAGE_ENRICH_MAX_ITEMS
    cleaned_lookup: dict[str, str] = {}
    line_keys: list[str | None] = []
    line_prices: list[str | None] = []

    for line in dip_results:
        line_prices.append(_extract_price_token(str(line.get("content", ""))))
        cleaned_name = clean_dish_name(line["content"])
        if not cleaned_name:
            line_keys.append(None)
            continue
        normalized_key = cleaned_name.casefold()
        cleaned_lookup.setdefault(normalized_key, cleaned_name)
        line_keys.append(normalized_key)

    async def _fetch_unique(normalized_key: str, cleaned_name: str) -> tuple[str, dict[str, Any]]:
        dish = await get_dish_data(
            cleaned_name,
            accept_language,
            include_images=include_images,
        )
        return normalized_key, dish

    unique_tasks = [
        _fetch_unique(normalized_key, cleaned_name)
        for normalized_key, cleaned_name in cleaned_lookup.items()
    ]
    fanout_concurrency = _resolve_fanout_concurrency(len(unique_tasks))
    unique_results = await _gather_with_limit(
        unique_tasks,
        fanout_concurrency,
    )
    resolved_by_key = {key: value for key, value in unique_results}

    results: list[dict] = []
    for key, price_token in zip(line_keys, line_prices, strict=True):
        if key is None:
            results.append(_unknown_dish_result())
            continue
        resolved = resolved_by_key.get(key, _unknown_dish_result())
        output_item = dict(resolved)
        if price_token:
            output_item["price"] = price_token
        results.append(output_item)

    logger.info(
        "Dish fan-out stats total={} unique={} include_images={} concurrency={}",
        len(dip_results),
        len(cleaned_lookup),
        include_images,
        fanout_concurrency,
    )
    return results


@duration
async def process_dip_paragraph_results(
    dip_results: list[dict], accept_language: str
) -> list[dict]:
    tasks = [get_paragraph_data(line["content"], accept_language) for line in dip_results]
    fanout_concurrency = _resolve_fanout_concurrency(len(tasks))
    logger.info(
        "Paragraph fan-out stats total={} concurrency={}",
        len(tasks),
        fanout_concurrency,
    )
    return await _gather_with_limit(tasks, fanout_concurrency)


@duration
async def upload_pipeline_with_dip_auto_group_lines(
    image: bytes,
    img_height: int,
    img_width: int,
    accept_language: str | None,
) -> dict[str, list[dict]]:
    language = _resolve_language(accept_language)
    dip_results_in_lines = await run_dip(image, preserve_raw_lines=True)
    grouping_start = time.monotonic()
    paragraphs, individual_lines = await build_paragraph(dip_results_in_lines)
    grouping_elapsed = time.monotonic() - grouping_start
    logger.info(
        "Grouping stage elapsed={}s paragraphs={} individual_lines={}",
        round(grouping_elapsed, 3),
        len(paragraphs),
        len(individual_lines),
    )

    dish_info_task = process_dip_results(individual_lines, language)
    dish_description_task = process_dip_paragraph_results(paragraphs, language)
    fan_out_start = time.monotonic()
    dish_info, dish_description = await asyncio.gather(
        dish_info_task, dish_description_task
    )
    fan_out_elapsed = time.monotonic() - fan_out_start
    logger.info(
        "Dish fan-out elapsed={}s dish_lines={} paragraph_lines={}",
        round(fan_out_elapsed, 3),
        len(individual_lines),
        len(paragraphs),
    )

    dish_info_bounding_box = normalize_text_bbox_dip(img_width, img_height, individual_lines)
    dish_description_bounding_box = normalize_text_bbox_dip(img_width, img_height, paragraphs)
    if not dish_info and dish_description:
        return {"results": serialize_dish_data_filtered(dish_description, dish_description_bounding_box)}

    merged_dish_info, merged_boxes = merge_grouped_context_into_dishes(
        dish_info,
        dish_info_bounding_box,
        dish_description,
        dish_description_bounding_box,
    )
    return {"results": serialize_dish_data_filtered(merged_dish_info, merged_boxes)}


@duration
async def upload_pipeline_with_dip_layout_grouping_experiment(
    image: bytes,
    img_height: int,
    img_width: int,
    accept_language: str | None,
) -> dict[str, list[dict]]:
    language = _resolve_language(accept_language)
    dip_results_in_lines = await run_dip(image, preserve_raw_lines=True)
    grouping_start = time.monotonic()
    paragraphs, individual_lines, grouping_debug = await build_paragraph_layout_experiment(
        dip_results_in_lines
    )
    grouping_elapsed = time.monotonic() - grouping_start
    logger.info(
        "Layout experiment grouping elapsed={}s paragraphs={} individual_lines={} mode={} segment_count={} grouped_segment_count={}",
        round(grouping_elapsed, 3),
        len(paragraphs),
        len(individual_lines),
        grouping_debug.get("mode"),
        grouping_debug.get("segmentCount", 0),
        grouping_debug.get("groupedSegmentCount", 0),
    )

    layout_lines_for_wash: list[dict] = []
    for line in individual_lines:
        line_with_origin = dict(line)
        line_with_origin.setdefault("origin", "individual")
        layout_lines_for_wash.append(line_with_origin)
    for paragraph in paragraphs:
        paragraph_with_origin = dict(paragraph)
        paragraph_with_origin.setdefault("origin", "paragraph")
        paragraph_with_origin.setdefault("role_hint", "description")
        layout_lines_for_wash.append(paragraph_with_origin)

    wash_start = time.monotonic()
    (
        individual_dish_lines,
        price_lines,
        paragraph_context_lines,
        discarded_lines,
        wash_debug,
    ) = await wash_layout_lines(layout_lines_for_wash)
    wash_elapsed = time.monotonic() - wash_start
    logger.info(
        "Layout wash elapsed={}s mode={} dish_lines={} paragraph_lines={} price_lines={} discarded_lines={}",
        round(wash_elapsed, 3),
        wash_debug.get("mode"),
        len(individual_dish_lines),
        len(paragraph_context_lines),
        len(price_lines),
        len(discarded_lines),
    )

    dish_info_task = process_dip_results(individual_dish_lines, language)
    dish_description_task = process_dip_paragraph_results(paragraph_context_lines, language)
    fan_out_start = time.monotonic()
    dish_info, dish_description = await asyncio.gather(
        dish_info_task, dish_description_task
    )
    fan_out_elapsed = time.monotonic() - fan_out_start
    logger.info(
        "Layout experiment fan-out elapsed={}s dish_lines={} paragraph_lines={}",
        round(fan_out_elapsed, 3),
        len(individual_dish_lines),
        len(paragraph_context_lines),
    )

    dish_info_bounding_box = normalize_text_bbox_dip(
        img_width, img_height, individual_dish_lines
    )
    dish_description_bounding_box = normalize_text_bbox_dip(
        img_width, img_height, paragraph_context_lines
    )
    price_bounding_box = normalize_text_bbox_dip(img_width, img_height, price_lines)

    if not dish_info and dish_description:
        return {"results": serialize_dish_data_filtered(dish_description, dish_description_bounding_box)}

    merged_dish_info, merged_boxes = merge_grouped_context_into_dishes(
        dish_info,
        dish_info_bounding_box,
        dish_description,
        dish_description_bounding_box,
        price_lines=price_lines,
        price_boxes=price_bounding_box,
    )
    return {"results": serialize_dish_data_filtered(merged_dish_info, merged_boxes)}


async def analyze_menu_image(image: bytes, accept_language: str | None) -> dict[str, list[dict]]:
    processed_image, img_height, img_width = process_image(image)
    return await upload_pipeline_with_dip_auto_group_lines(
        processed_image, img_height, img_width, accept_language
    )


async def analyze_menu_image_layout_grouping_experiment(
    image: bytes,
    accept_language: str | None,
) -> dict[str, list[dict]]:
    processed_image, img_height, img_width = process_image(image)
    return await upload_pipeline_with_dip_layout_grouping_experiment(
        processed_image, img_height, img_width, accept_language
    )
