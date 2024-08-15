import os

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from src.core.vendors.supabase.client import SupabaseClient
from src.main import app

from src.services.menu import cache_dish_image
pytest_plugins = ('pytest_asyncio',)
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(env_path)  # This will load the .env file automatically if present
client = TestClient(app)



@pytest.mark.asyncio
async def test_cache_dish_image():
    with TestClient(app) as client:
        # build cache
        # generate a random uuid   
        test_dishname="test_dishname"
        supabase = await SupabaseClient.get_client()
        result =await supabase.table("dish").delete().eq("dish_name", test_dishname).execute()
        build_or_update_cache =await cache_dish_image(test_dishname, ['test','test2'])
        assert build_or_update_cache in ["update cache","build cache"], "no cache is build or update"
        no_caching = await cache_dish_image("test_dishname", ['test','test2'])
        assert no_caching == "no cache", "faield to cache"
        result =await supabase.table("dish").delete().eq("dish_name", test_dishname).execute()
