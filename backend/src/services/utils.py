import asyncio
import functools
from loguru import logger
import re
import time
from dataclasses import dataclass
from typing import Callable, ParamSpec, TypeVar

from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.runnables import RunnableSerializable
from langchain_openai import ChatOpenAI

from src.core.config import settings
from src.models import Dish

P = ParamSpec("P")
T = TypeVar("T")
_DISABLED_REASONING_EFFORTS = {"", "none"}


def duration(func: Callable[P, T]) -> Callable[P, T]:
    if asyncio.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.monotonic()
            result = await func(*args, **kwargs)
            end = time.monotonic()
            logger.opt(depth=1).info("Elapsed time for {}: {:.3f}s", func.__name__, end - start)
            return result
        return async_wrapper
    else:
        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.monotonic()
            result = func(*args, **kwargs)
            end = time.monotonic()
            logger.opt(depth=1).info("Elapsed time for {}: {:.3f}s", func.__name__, end - start)
            return result
        return sync_wrapper


@dataclass
class BoundingBox:
    """Bounding box for detected text in image in percentage"""

    x: float
    y: float
    w: float
    h: float


def clean_dish_name(dish_name: str) -> str:
    # Remove trailing prices such as "- 7", "- $7.5", ": 1,200円"
    cleaned_name = re.sub(
        r"[-–—:]\s*(?:[$€£¥]\s*)?\d+(?:[.,]\d+)?(?:\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))?",
        "",
        dish_name,
        flags=re.IGNORECASE,
    )
    cleaned_name = re.sub(
        r"\(\s*vg\s*\)", "", cleaned_name, flags=re.IGNORECASE
    )  # Removes vegan indicator '(vg)'
    cleaned_name = re.sub(
        r"\s*(?:[$€£¥]\s*\d+(?:[.,]\d+)?|\d+[.,]\d+|\d+\s?(?:usd|eur|gbp|cad|aud|cny|rmb|円))",
        "",
        cleaned_name,
        flags=re.IGNORECASE,
    )  # Removes standalone prices like '$7.5' or '12'
    cleaned_name = re.sub(
        r"\s+", " ", cleaned_name
    ).strip()  # Clean up extra spaces and trim

    return cleaned_name


def resolve_reasoning_effort(raw_effort: str | None = None) -> str | None:
    effort = settings.OPENAI_REASONING_EFFORT if raw_effort is None else raw_effort
    normalized_effort = (effort or "").strip().lower()
    if normalized_effort in _DISABLED_REASONING_EFFORTS:
        return None
    return normalized_effort


def build_openai_reasoning_kwargs(
    raw_effort: str | None = None,
) -> dict[str, dict[str, str]]:
    reasoning_effort = resolve_reasoning_effort(raw_effort)
    if reasoning_effort is None:
        return {}
    return {"reasoning": {"effort": reasoning_effort}}


def build_chat_openai(
    model: str | None = None,
    reasoning_effort: str | None = None,
    temperature: float | None = None,
) -> ChatOpenAI:
    model_name = model or settings.OPENAI_MODEL
    llm_kwargs = {
        "model_name": model_name,
        "openai_api_base": settings.OPENAI_BASE_URL,
        "openai_api_key": settings.OPENAI_API_KEY,
    }
    resolved_effort = resolve_reasoning_effort(reasoning_effort)
    if resolved_effort is not None:
        llm_kwargs["reasoning_effort"] = resolved_effort
    if temperature is not None:
        llm_kwargs["temperature"] = temperature
    return ChatOpenAI(**llm_kwargs)


def build_search_chain(model: str | None = None) -> RunnableSerializable:
    selected_model = model or settings.MENU_DISH_INFO_LLM_MODEL or settings.OPENAI_MODEL
    llm = build_chat_openai(
        selected_model,
        temperature=settings.MENU_DISH_INFO_LLM_TEMPERATURE,
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", PROMPT),
            (
                "human",
                "Target language: '{accept_language}'. OCR text: '{dish_name}'. "
                "Return only the structured fields.",
            ),
        ]
    )
    runnable = prompt | llm.with_structured_output(Dish,method="function_calling")
    return runnable


PROMPT = """\
You are a multilingual menu extraction assistant. Return structured JSON with:
- dish_name
- dish_translation
- dish_description

Rules:
- dish_name must be an explicit menu item title in original language/script.
- Preserve accents and original spelling for dish_name (for example: CAFÉ MOCHA stays CAFÉ MOCHA).
- Do NOT treat description fragments as dish_name.
- Do NOT treat brand names, section headers, slogans, legal/promo copy, or standalone prices as dish_name.
- If the OCR text is not a valid dish name, return dish_name="Unknown" and null for other attributes.
- dish_translation must be one final translation in target language '{accept_language}'.
- dish_translation must be plain phrase text only; never output reasoning, alternatives, or uncertainty.
- Never include meta words or self-talk such as "wait", "translation", "or", "maybe", question prompts, or explanations.
- dish_description should be one brief sentence in target language '{accept_language}', only when dish_name is valid.

Normalization examples (menu terminology):
- If target language is zh-CN:
  - CAFÉ MOCHA -> 摩卡咖啡
  - CAPPUCCINO -> 卡布奇诺
  - LATTE -> 拿铁咖啡
"""


def build_recommendation_chain(model: str | None = None) -> RunnableSerializable:
    llm = build_chat_openai(model)
    prompt_template = PromptTemplate(
        input_variables=["dish_names", "mode", "additional_info", "language"],
        template=SUGGESTION_PROMPT,
    )
    return prompt_template | llm


SUGGESTION_PROMPT = """\
    You are an AI sommelier and culinary expert. Based on the following information, suggest dishes for the user:

    Available dishes: {dish_names}
    Additional information: {additional_info}
    Language: {language}

    Please provide recommendations considering the following: 1. If is only one person, curate a balanced meal for a 
    single person, including: - One or two appetizers (e.g., soups, salads, or small dishes) - One main course (
    entrée) - One dessert - One drink (alcoholic or non-alcoholic, based on additional information or user 
    preference) 2. If more than one people, recommend dishes suitable for sharing and portion of the number of 
    people, with or without main dishes as specified. 3. Take into account any specific dishes the user wants to 
    order. 4. Consider any dietary restrictions mentioned. 5. Provide your response in the specified language. 6. 
    Output in concise and plain language (no markdown or HTML).

    Your recommendations:
"""
