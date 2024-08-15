import os

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from src.core.vendors.supabase.client import SupabaseClient
from src.main import app
import cv2
import numpy as np
from src.services.menu import process_image
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


@pytest.mark.asyncio
async def test_prcess_image():


    def process_image_valid_image():
        image = cv2.imencode('.jpeg', np.zeros((1000, 1000, 3), dtype=np.uint8))[1].tobytes()
        processed_image, img_height, img_width = process_image(image)
        assert processed_image is not None
        assert img_height == 1000
        assert img_width == 1000

    def process_image_large_image():
        image = cv2.imencode('.jpeg', np.zeros((3000, 3000, 3), dtype=np.uint8))[1].tobytes()
        processed_image, img_height, img_width = process_image(image)
        assert processed_image is not None
        assert img_height <= 2000
        assert img_width <= 2000

    def process_image_compression():
        image = cv2.imencode('.jpeg', np.zeros((10000, 10000, 3), dtype=np.uint8))[1].tobytes()
        processed_image, img_height, img_width = process_image(image)
        assert processed_image is not None
        assert len(processed_image) < 4 * 1024 * 1024 - 100, len(processed_image)

            
    process_image_valid_image()
    process_image_large_image()
    process_image_compression()