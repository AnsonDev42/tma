import http

import pytest
from fastapi import HTTPException

from src.api.deps import get_user


def test_get_user_rejects_invalid_authorization_header():
    with pytest.raises(HTTPException) as exc:
        get_user("invalid-token")

    assert exc.value.status_code == http.HTTPStatus.UNAUTHORIZED


def test_get_user_parses_bearer_token(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "src.api.deps.verify_jwt",
        lambda token: {
            "role": "authenticated",
            "user_metadata": {"user_role": "free"},
            "iat": 0,
            "exp": 4_102_444_800,
            "sub": f"user-{token}",
        },
    )

    user = get_user("Bearer my-token")

    assert user.sub == "user-my-token"
    assert user.user_role.value == "free"
