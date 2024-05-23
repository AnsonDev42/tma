import functools
import logging
import re
import time
from dataclasses import dataclass
from typing import Callable, ParamSpec, TypeVar

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableSerializable
from langchain_openai import ChatOpenAI

from src.core.config import settings
from src.models import Dish

P = ParamSpec("P")
T = TypeVar("T")


def duration(func: Callable[P, T]) -> Callable[P, T]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        start = time.monotonic()
        result = func(*args, **kwargs)
        end = time.monotonic()
        logging.info("Elapsed time for %s: %s", func.__name__, end - start)
        return result

    return wrapper


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
        model=model,
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
    runnable = prompt | llm.with_structured_output(schema=Dish)
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
