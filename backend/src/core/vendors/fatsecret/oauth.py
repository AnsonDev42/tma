import httpx
from src.core.config import settings
from src.core.vendors.fatsecret.token_storage import TokenStorage


class FatSecretOAuth:
    def __init__(self):
        self.token_url = settings.FATSECRET_TOKEN_URL
        self.client_id = settings.FATSECRET_CLIENT_ID
        self.client_secret = settings.FATSECRET_CLIENT_SECRET
        self.token_storage = TokenStorage()

    async def get_access_token(self) -> str:
        # Check if a valid token is already stored
        token = self.token_storage.get_token()
        if token:
            return token

        # If not, request a new token
        token = await self.request_new_token()
        self.token_storage.store_token(token)
        return token

    async def request_new_token(self) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "scope": "basic",
                },
                auth=(self.client_id, self.client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()["access_token"]


fat_secret_oauth_client = FatSecretOAuth()
