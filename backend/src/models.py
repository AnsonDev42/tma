from typing import Optional

from pydantic import BaseModel,Field


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


class Dish(BaseModel):
    """Information about a Dish."""

    dish_name: str = Field(
        default="Unknown",
        description="The most possible full dish name from the OCR result in original "
        "language. ",
    )
    dish_translation: Optional[str] = Field(
        default=None, description="Translated dish name in  $Target-Language"
    )
    dish_description: Optional[str] = Field(
        default=None,
        description="A brief introduction to the dish based on its name such as common ingredients, history and etc.",
    )

if __name__ == "__main__":
    print(Dish(dish_name="just me").dish_name)