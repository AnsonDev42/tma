import jwt
from src.core.config import settings

ALGORITHM = "HS256"


def verify_jwt(token: str):
    payload = jwt.decode(
        token, settings.SECRET_KEY, algorithms=[ALGORITHM], audience="authenticated"
    )
    return payload
