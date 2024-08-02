import logging
import socket

from supabase._async.client import AsyncClient, create_client

from src.core.config import settings
from src.services.utils import build_search_chain

logger = logging.getLogger(__name__)

chain = build_search_chain(model="gpt-4o-mini")

supabase: AsyncClient = None  # This will be initialized during startup


async def initialize_supabase():
    """this would be called during startup to initialize the supabase client, in main.py"""
    global supabase
    supabase = await create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def get_supabase_client() -> AsyncClient:
    if supabase is None:
        raise ValueError("Supabase client is not initialized")
    return supabase


try:
    IP = socket.gethostbyname("anson-eq.local")
except socket.gaierror:
    IP = "anson-eq.local"
    logger.error("Could not resolve hostname, using default hostname")

WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = f"http://{IP}:9998/ocr/prediction"
