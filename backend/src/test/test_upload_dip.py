import os

import ujson
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from src.api.deps import get_user
from src.core.config import settings
from src.core.vendors.supabase.client import SupabaseClient
from src.main import app
import pytest

from src.services.menu import (
    post_dip_request,
    retrieve_dip_results,
    process_dip_results,
)
from src.test.fixtures.get_user import override_get_free_user

pytest_plugins = ("pytest_asyncio",)
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(env_path)  # This will load the .env file automatically if present
client = TestClient(app)


@pytest.mark.asyncio
async def test_post_upload_dip():
    """
    test post function to azure dip api

    """
    file_path = os.path.join(os.path.dirname(__file__), "fixtures/test1.jpg")
    with open(file_path, "rb") as f:
        file_content = f.read()

    response_url = await post_dip_request(file_content)
    assert response_url is not None, "response_url is None"
    assert (
        response_url.startswith("https://") is True
    ), "response_url does not start with https://"


@pytest.mark.asyncio
async def test_dip_post_response():
    """test_upload_ocr.py
    test post function to azure ocr api
    """
    with TestClient(app) as client:
        sample_url = f"{settings.AZURE_DIP_BASE_URL}/documentintelligence/documentModels/prebuilt-read/analyzeResults/cc0a9698-82b7-4502-b934-a98a3bd70291?api-version=2024-02-29-preview"
        responses = await retrieve_dip_results(sample_url)
        responses = responses

        # responses = {}
        # responses = ujson.loads(open("dip_results.json").read())

        assert responses is not None, "responses is None"

        assert (
            responses.get("status") == "succeeded"
        ), f"status is not succeeded: {responses.get('status')}"
        assert (
            responses.get("analyzeResult").get("modelId") == "prebuilt-read"
        ), "modelId is not prebuilt-read"
        assert (
            responses.get("analyzeResult").get("content") is not None
        ), "content is None"


@pytest.mark.asyncio
async def test_process_dip_results():
    file_path = os.path.join(os.path.dirname(__file__), "fixtures/dip_results.json")
    with TestClient(app) as c:
        responses = ujson.loads(open(file_path).read())
        dip_results = responses["analyzeResult"]["pages"][0]["lines"]
        result = await process_dip_results(dip_results, "us-en")
        assert result[2]["text"].lower() == "PIZZERIA".lower(), result[2]



@pytest.mark.asyncio
async def test_upload_dip():
    """
    test the upload function with dip

    """
    await SupabaseClient.initialize()

    app.dependency_overrides[get_user] = override_get_free_user

    headers = {
        "Authorization": "Bearer test-token",
        "dip": "true",
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
