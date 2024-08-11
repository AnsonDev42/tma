import logging
import socket

from supabase._async.client import AsyncClient, create_client

from src.core.config import settings
from src.services.utils import build_search_chain, build_recommendation_chain
from src.core.vendors.fatsecret.client import FatSecretClient

logger = logging.getLogger(__name__)

chain = build_search_chain(model="gpt-4o-mini")
recommendation_chain = build_recommendation_chain(model="gpt-4o-mini")

fatscret = None


class SupabaseClient:
    _instance: AsyncClient = None

    @classmethod
    async def initialize(cls):
        if cls._instance is None:
            cls._instance = await create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized")

    @classmethod
    async def get_client(cls) -> AsyncClient:
        if cls._instance is None:
            raise ValueError("Supabase client is not initialized")
        return cls._instance


async def initialize_fatsecret():
    global fatscret
    fatscret = FatSecretClient()


async def get_fatsecret_client():
    if fatscret is None:
        raise ValueError("Fatsecret client is not initialized")
    return fatscret


try:
    IP = socket.gethostbyname("anson-eq.local")
except socket.gaierror:
    IP = "anson-eq.local"
    logger.error("Could not resolve hostname, using default hostname")

WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = f"http://{IP}:9998/ocr/prediction"
