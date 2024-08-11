import httpx
from httpx import AsyncClient

from src.core.config import settings
from src.core.vendors.fatsecret.oauth import FatSecretOAuth
from src.core.vendors.utilities.client import logger


class FatSecretClient:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(FatSecretClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.oauth_client = FatSecretOAuth()
        self._initialized = True
        logger.info("FatSecret client initialized")

    @classmethod
    async def get_client(cls) -> AsyncClient:
        if cls._instance is None:
            cls._instance = FatSecretClient()
        return cls._instance
    
    async def search_food(self, query: str):
        access_token = await self.oauth_client.get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.FATSECRET_BASE_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                data={
                    "method": "foods.search",
                    "search_expression": query,
                    "format": "json",
                },
            )
            response.raise_for_status()
            return response.json()