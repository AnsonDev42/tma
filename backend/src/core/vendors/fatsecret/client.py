import httpx

from src.core.config import settings
from src.core.vendors.fatsecret.oauth import FatSecretOAuth


class FatSecretClient:
    def __init__(self):
        self.oauth_client = FatSecretOAuth()

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
