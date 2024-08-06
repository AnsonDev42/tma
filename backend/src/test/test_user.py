import os

import pytest
import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from supabase._async.client import create_client

from src.api.user import router as user_router
from src.core.config import settings
from src.core.vendor import initialize_supabase, get_supabase_client

import pytest
from unittest.mock import AsyncMock, patch


@pytest.fixture(autouse=True)
def mock_env_vars():
    with patch.dict(os.environ, {
        "OPENAI_API_KEY": "test_openai_api_key",
        "AZURE_OCR_API_KEY": "test_azure_ocr_api_key",
        "AZURE_OCR_BASE_URL": "test_azure_ocr_base_url",
        "GOOGLE_IMG_SEARCH_CX": "test_google_img_search_cx",
        "GOOGLE_IMG_SEARCH_KEY": "test_google_img_search_key",
        "SUPABASE_URL": settings.SUPABASE_URL,
        "SUPABASE_KEY": SUPABASE_KEY,
        # Add other required environment variables here
    }):
        yield


@pytest.fixture
async def supabase_client():
    client = await create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    yield client


@pytest.fixture
async def mock_supabase_client():
    mock_client = await create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    with patch('src.core.vendor.supabase', mock_client):
        yield mock_client


@pytest.fixture
def client():
    with TestClient(user_router) as client:
        yield client


SUPABASE_URL = settings.SUPABASE_URL
# ANON key, okay to expose
SUPABASE_KEY = "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd29kaGVoenRlbXpjcHNvZnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMjA3MTksImV4cCI6MjAzMDY5NjcxOX0.j4O3aKoITFoJi36sQiPoh5PUWSDwwDDh02hhmMRF8HY"


async def create_and_login_user(email: str, password: str):
    """

    ***if user not exist, creating user would require email verification
    """
    supabase = await create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    await supabase.auth.sign_up(
        credentials={"email": "test@itsya0wen.com", "password": "test@itsya0wen.com"}
    )

    # Login the user
    await supabase.auth.sign_in_with_password({"email": email, "password": password})
    data = await supabase.auth.get_session()
    return data


@pytest.mark.asyncio
async def test_get_access_limits(supabase_client, client):
    email = "test@itsya0wen.com"
    password = "test@itsya0wen.com"

    # Create and log in the user to get the JWT token
    data = await create_and_login_user(email, password)
    jwt_token = data.access_token
    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }
    print(headers)
    with patch('src.core.vendor.supabase', return_value=supabase_client):
        with patch('src.core.vendor.get_supabase_client', return_value=supabase_client):
            response = client.get("/user-info", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "role" in data
            assert "daily_limit" in data
            assert "remaining_accesses" in data
#
# @pytest.mark.asyncio
# async def test_record_access(client):
#     email = "testuser@example.com"
#     password = "testpassword"
#
#     # Create and log in the user to get the JWT token
#     jwt_token = await create_and_login_user(email, password)
#
#     headers = {
#         "Authorization": f"Bearer {jwt_token}"
#     }
#
#     response = client.post("/record-access", headers=headers)
#     assert response.status_code == 200
#     data = response.json()
#     assert data["message"] == "Access recorded successfully"
