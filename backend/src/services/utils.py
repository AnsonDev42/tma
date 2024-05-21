import functools
import logging
import time
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
