from supabase._async.client import AsyncClient, create_client

from src.core.config import settings
from src.core.vendors.utilities.client import logger


class SupabaseClient:
    _instance: AsyncClient = None

    @classmethod
    async def initialize(cls):
        if cls._instance is None:
            cls._instance = await create_client(
                settings.SUPABASE_URL, settings.SUPABASE_KEY
            )
            logger.info("Supabase client initialized")

    @classmethod
    async def get_client(cls) -> AsyncClient:
        if cls._instance is None:
            raise ValueError("Supabase client is not initialized")
        return cls._instance
