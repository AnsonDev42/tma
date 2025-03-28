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
    # Remove price indicators that typically follow a dash or are set in parentheses
    cleaned_name = re.sub(
        r"[-–—]\s*\d+\.?\d*", "", dish_name
    )  # Handles 'Dish Name - 7' or 'Dish – 7.5'
    cleaned_name = re.sub(
        r"\(\s*vg\s*\)", "", cleaned_name, flags=re.IGNORECASE
    )  # Removes vegan indicator '(vg)'
    cleaned_name = re.sub(
        r"\s*\d+\.\d*", "", cleaned_name
    )  # Removes standalone prices like '7.5' or '12'
    cleaned_name = re.sub(
        r"\s+", " ", cleaned_name
    ).strip()  # Clean up extra spaces and trim

    return cleaned_name


def build_search_chain(model: str = "gpt-3.5-turbo") -> RunnableSerializable:
    llm = ChatOpenAI(
        model_name=model,
        openai_api_base=settings.OPENAI_BASE_URL,
        openai_api_key=settings.OPENAI_API_KEY,
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", PROMPT),
            (
                "human",
                "Return in the instructed JSON format for what is the most possible food or food description,"
                " from OCR result: '{dish_name}'",
            ),
        ]
    )
    runnable = prompt | llm.with_structured_output(Dish,method="function_calling")
    return runnable


PROMPT = """\
You are a helpful assistant specialized in food industry and translation, designed to output structured JSON response
 with attributes 'dish_name','dish_translation' and 'dish_description'. The 'dish_name' should be a cleaned-up version
 of the dish name (or dish description in some cases) in in its original language from the OCR result which may contains
  error. 'dish_translation' should translate the 'dish_name' to user's preferred language code: $Target-Language =
   '{accept_language}' The 'dish_description' should be a brief introduction to the dish in $Target-Language as well.
    If you don't think the OCR result is relevant to food, it may due to OCR errors or the texts is not a food, such as
    a restaurant name, or price info. In this case, please return null for all attributes value.
"""


def build_recommendation_chain(model: str = "gpt-4o-mini") -> RunnableSerializable:
    llm = ChatOpenAI(
        model_name=model,
        openai_api_base=settings.OPENAI_BASE_URL,
        openai_api_key=settings.OPENAI_API_KEY,
    )
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
