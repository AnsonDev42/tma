from typing import Optional

from pydantic import BaseModel

# langchain currently only supports pydantic v1
from langchain_core.pydantic_v1 import BaseModel as BaseModelV1, Field as FieldV1

from enum import Enum


class Role(str, Enum):
    FREE = "free"
    TRIAL = "trial"
    PRO = "pro"


class User(BaseModel):
    role: str
    user_metadata: dict
    iat: int
    exp: int
    sub: str

    @property
    def user_role(self):
        return Role(self.user_metadata.get("user_role", Role.FREE))


class Dish(BaseModelV1):
    """Information about a Dish."""

    # ^ Doc-string for the entity Person.
    # This doc-string is sent to the LLM as the description of the schema dish,
    # and it can help to improve extraction results.

    # Note that:
    # 1. Each field is an `optional` -- this allows the model to decline to extract it!
    # 2. Each field has a `description` -- this description is used by the LLM.
    # Having a good description can help improve extraction results.
    dish_name: Optional[str] = FieldV1(
        default="Unknown",
        description="The most possible full dish name from the OCR result in original "
        "language. ",
    )
    dish_translation: Optional[str] = FieldV1(
        default=None, description="Translated dish name in  $Target-Language"
    )
    dish_description: Optional[str] = FieldV1(
        default=None,
        description="A brief introduction to the dish based on its name such as common ingredients, history and etc.",
    )
