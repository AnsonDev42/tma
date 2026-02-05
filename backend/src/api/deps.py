import http

from fastapi import Header, HTTPException

from src.core.security import verify_jwt
from src.models import User


def get_user(authorization: str = Header(..., alias="Authorization")) -> User:
    try:
        prefix = "Bearer "
        if not authorization.startswith(prefix):
            raise ValueError("Invalid authorization header")
        token = authorization[len(prefix):]
        payload = verify_jwt(token)
        return User(**payload)
    except Exception:
        raise HTTPException(status_code=http.HTTPStatus.UNAUTHORIZED)
