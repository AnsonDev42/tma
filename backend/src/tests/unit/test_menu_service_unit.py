import asyncio

import pytest

from src.core.config import settings
from src.services.menu import process_dip_paragraph_results, process_dip_results


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
