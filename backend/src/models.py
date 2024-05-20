from pydantic import BaseModel


class User(BaseModel):
    role: str
    user_metadata: dict
    iat: int
    exp: int
