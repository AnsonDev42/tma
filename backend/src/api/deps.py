import http

from fastapi import Header, HTTPException, Depends

from src.core.security import verify_jwt
from src.models import User, Role


def get_user(authorization: str = Header("Authorization")) -> User:
    try:
        token = authorization.split("Bearer ")[1]
        payload = verify_jwt(token)
        return User(**payload)
    except Exception:
        raise HTTPException(status_code=http.HTTPStatus.UNAUTHORIZED)


def check_user_role(user: User, required_roles: list[Role]):
    if user.user_role not in required_roles:
        raise HTTPException(
            status_code=http.HTTPStatus.FORBIDDEN, detail="Insufficient privileges"
        )
    return user


def get_pro_user(user: User = Depends(get_user)):
    return check_user_role(user, [Role.PRO, Role.TRIAL, Role.FREE])
