import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from src.api.deps import get_user
from src.core.vendors.supabase.client import SupabaseClient
from src.main import app
from src.models import User


@pytest.fixture(autouse=True)
def mock_startup_dependencies(monkeypatch: pytest.MonkeyPatch):
    async def fake_initialize(cls):
        return None

    monkeypatch.setattr(SupabaseClient, "initialize", classmethod(fake_initialize))
    monkeypatch.setattr("src.main.FatSecretClient", lambda *args, **kwargs: None)


@pytest.fixture
def test_user() -> User:
    return User(
        role="authenticated",
        user_metadata={"user_role": "free"},
        iat=0,
        exp=4_102_444_800,
        sub="test-user-id",
    )


@pytest.fixture
def client(test_user: User):
    app.dependency_overrides[get_user] = lambda: test_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_image_bytes() -> bytes:
    image = np.zeros((320, 640, 3), dtype=np.uint8)
    success, encoded = cv2.imencode(".jpeg", image)
    assert success
    return encoded.tobytes()
