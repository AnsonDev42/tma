import asyncio

import pytest

from src.core.config import settings
from src.services.menu import process_dip_paragraph_results, process_dip_results, run_dip


def _line(content: str) -> dict:
    return {"content": content, "polygon": {"x_coords": [1.0, 2.0], "y_coords": [1.0, 2.0]}}


def _dish_payload(text: str) -> dict:
    return {
        "description": f"{text}-desc",
        "text": text,
        "text_translation": text,
        "img_src": None,
    }


@pytest.mark.asyncio
async def test_process_dip_results_skips_images_when_item_count_exceeds_threshold(
    monkeypatch,
):
    calls: list[bool] = []

    async def fake_get_dish_data(dish_name: str, _accept_language: str, *, include_images: bool = True):
        calls.append(include_images)
        return _dish_payload(dish_name)

    monkeypatch.setattr("src.services.menu.get_dish_data", fake_get_dish_data)
    monkeypatch.setattr(settings, "MENU_IMAGE_ENRICH_MAX_ITEMS", 30, raising=False)

    dip_results = [_line(f"Dish {idx}") for idx in range(31)]
    result = await process_dip_results(dip_results, "en")

    assert len(result) == 31
    assert calls
    assert all(include_images is False for include_images in calls)


@pytest.mark.asyncio
async def test_process_dip_results_dedupes_cleaned_dish_names(monkeypatch):
    calls: list[str] = []

    async def fake_get_dish_data(dish_name: str, _accept_language: str, *, include_images: bool = True):
        calls.append(dish_name)
        return _dish_payload(dish_name)

    monkeypatch.setattr("src.services.menu.get_dish_data", fake_get_dish_data)
    monkeypatch.setattr(settings, "MENU_IMAGE_ENRICH_MAX_ITEMS", 30, raising=False)

    dip_results = [_line("Sushi - 12"), _line("sushi - 14"), _line("SUSHI - 11")]
    result = await process_dip_results(dip_results, "en")

    assert calls == ["Sushi"]
    assert [item["text"] for item in result] == ["Sushi", "Sushi", "Sushi"]


@pytest.mark.asyncio
async def test_process_dip_results_preserves_extracted_price_per_line(monkeypatch):
    async def fake_get_dish_data(
        dish_name: str, _accept_language: str, *, include_images: bool = True
    ):
        return _dish_payload(dish_name)

    monkeypatch.setattr("src.services.menu.get_dish_data", fake_get_dish_data)
    monkeypatch.setattr(settings, "MENU_IMAGE_ENRICH_MAX_ITEMS", 30, raising=False)

    dip_results = [_line("Udon - $12.50"), _line("Udon - $14.00")]
    result = await process_dip_results(dip_results, "en")

    assert [item["text"] for item in result] == ["Udon", "Udon"]
    assert [item.get("price") for item in result] == ["$12.50", "$14.00"]


@pytest.mark.asyncio
async def test_process_dip_results_preserves_input_order_with_limited_concurrency(
    monkeypatch,
):
    async def fake_get_dish_data(dish_name: str, _accept_language: str, *, include_images: bool = True):
        await asyncio.sleep(0.01 if dish_name.endswith("2") else 0)
        return _dish_payload(dish_name)

    monkeypatch.setattr("src.services.menu.get_dish_data", fake_get_dish_data)
    monkeypatch.setattr(settings, "MENU_DISH_FANOUT_CONCURRENCY", 2, raising=False)
    monkeypatch.setattr(settings, "MENU_IMAGE_ENRICH_MAX_ITEMS", 99, raising=False)

    dip_results = [_line("Dish 1"), _line("Dish 2"), _line("Dish 3"), _line("Dish 2")]
    result = await process_dip_results(dip_results, "en")

    assert [item["text"] for item in result] == ["Dish 1", "Dish 2", "Dish 3", "Dish 2"]


@pytest.mark.asyncio
async def test_process_dip_results_uses_adaptive_concurrency_cap(monkeypatch):
    seen_concurrency: list[int] = []

    async def fake_get_dish_data(
        dish_name: str, _accept_language: str, *, include_images: bool = True
    ):
        return _dish_payload(dish_name)

    async def fake_gather_with_limit(coroutines, concurrency_limit: int):
        seen_concurrency.append(concurrency_limit)
        return await asyncio.gather(*coroutines)

    monkeypatch.setattr("src.services.menu.get_dish_data", fake_get_dish_data)
    monkeypatch.setattr("src.services.menu._gather_with_limit", fake_gather_with_limit)
    monkeypatch.setattr(settings, "MENU_DISH_FANOUT_CONCURRENCY", 12, raising=False)
    monkeypatch.setattr(settings, "MENU_DISH_FANOUT_ADAPTIVE", True, raising=False)
    monkeypatch.setattr(
        settings, "MENU_DISH_FANOUT_MAX_CONCURRENCY", 100, raising=False
    )
    monkeypatch.setattr(settings, "MENU_IMAGE_ENRICH_MAX_ITEMS", 999, raising=False)

    dip_results = [_line(f"Dish {idx}") for idx in range(150)]
    await process_dip_results(dip_results, "en")

    assert seen_concurrency == [100]


@pytest.mark.asyncio
async def test_run_dip_preserve_raw_lines_keeps_numeric_and_unknown(monkeypatch):
    async def fake_post_dip_request(_image: bytes) -> str:
        return "https://fake-dip/result/raw"

    async def fake_retrieve_dip_results(_url: str, timeout: int = 6):
        return {
            "status": "succeeded",
            "analyzeResult": {
                "pages": [
                    {
                        "lines": [
                            {"content": "Dish Name", "polygon": [10, 10, 30, 10, 30, 20, 10, 20]},
                            {"content": "12.5", "polygon": [50, 10, 60, 10, 60, 20, 50, 20]},
                            {"content": "unknown", "polygon": [70, 10, 90, 10, 90, 20, 70, 20]},
                        ]
                    }
                ]
            },
        }

    monkeypatch.setattr("src.services.menu.post_dip_request", fake_post_dip_request)
    monkeypatch.setattr("src.services.menu.retrieve_dip_results", fake_retrieve_dip_results)

    default_filtered = await run_dip(b"fake-image")
    preserved = await run_dip(b"fake-image", preserve_raw_lines=True)

    assert [line["content"] for line in default_filtered] == ["Dish Name"]
    assert [line["content"] for line in preserved] == ["Dish Name", "12.5", "unknown"]


@pytest.mark.asyncio
async def test_process_dip_paragraph_results_uses_fixed_concurrency_when_adaptive_disabled(
    monkeypatch,
):
    seen_concurrency: list[int] = []

    async def fake_get_paragraph_data(dish_name: str, _accept_language: str):
        return _dish_payload(dish_name)

    async def fake_gather_with_limit(coroutines, concurrency_limit: int):
        seen_concurrency.append(concurrency_limit)
        return await asyncio.gather(*coroutines)

    monkeypatch.setattr(
        "src.services.menu.get_paragraph_data", fake_get_paragraph_data
    )
    monkeypatch.setattr("src.services.menu._gather_with_limit", fake_gather_with_limit)
    monkeypatch.setattr(settings, "MENU_DISH_FANOUT_CONCURRENCY", 7, raising=False)
    monkeypatch.setattr(settings, "MENU_DISH_FANOUT_ADAPTIVE", False, raising=False)
    monkeypatch.setattr(
        settings, "MENU_DISH_FANOUT_MAX_CONCURRENCY", 100, raising=False
    )

    paragraphs = [_line(f"desc {idx}") for idx in range(20)]
    await process_dip_paragraph_results(paragraphs, "en")

    assert seen_concurrency == [7]
