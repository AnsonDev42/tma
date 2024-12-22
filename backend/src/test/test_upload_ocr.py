import os

from dotenv import load_dotenv
from fastapi.testclient import TestClient

from src.api.deps import get_user
from src.core.vendors.supabase.client import SupabaseClient
from src.main import app
import pytest

from src.test.fixtures.get_user import override_get_free_user

pytest_plugins = ("pytest_asyncio",)
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(env_path)  # This will load the .env file automatically if present
client = TestClient(app)


@pytest.mark.asyncio
async def test_upload_ocr():
    await SupabaseClient.initialize()

    app.dependency_overrides[get_user] = override_get_free_user

    headers = {
        "Authorization": "Bearer test-token",
        "dip": "false",
    }
    # make the following path relative to the test file (fixture/test1.jpg)

    file_path = os.path.join(os.path.dirname(__file__), "fixtures/test1.jpg")

    with open(file_path, "rb") as f:
        file_content = f.read()

    # Prepare the form data
    form_data = {
        "file": (os.path.basename(file_path), file_content, "image/jpeg"),
        "file_name": os.path.basename(file_path).split(".")[0] + "_compressed.jpg",
    }

    response = client.post(
        "/upload",
        headers=headers,
        files=form_data,
    )
    assert response.status_code == 200
