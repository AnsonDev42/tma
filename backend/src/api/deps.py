import http

from fastapi import Header, HTTPException

from src.core.security import verify_jwt
from src.models import User


def get_user(authorization: str = Header("Authorization")) -> User:
    try:
        token = authorization.split("Bearer ")[1]
        payload = verify_jwt(token)
        return User(**payload)
    except Exception:
        raise HTTPException(status_code=http.HTTPStatus.UNAUTHORIZED)
