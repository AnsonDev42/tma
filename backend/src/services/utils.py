import functools
import logging
import time
from dataclasses import dataclass
from typing import Callable, ParamSpec, TypeVar

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


PROMPT = """\
You are a helpful assistant specialized in food industry and translation, designed to
output structured JSON response with keys 'dish-name' and 'dish-description',
in the user's preferred language code ($Target-Language): '{}'. The
'dish-name' should be the cleaned-up version of the OCR result in $Target-Language;
'dish-name' may contains prices of the dish such as '- 4', please remove them.
the 'dish-description' should be a brief introduction to the dish based on its name in $Target-Language.
If you don't think the OCR result is relevant to food, it may due to OCR errors or the texts is
not a dish, like a restaurant name, or price info. In this case, please return value of
'dish-name' as its original OCR result and 'dish-description' as null.
"""
