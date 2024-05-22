import logging
import socket

from openai import AsyncOpenAI

from src.core.config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)

try:
    IP = socket.gethostbyname("anson-eq.local")
except socket.gaierror:
    IP = "anson-eq.local"
    logger.error("Could not resolve hostname, using default hostname")

SEARXNG_API_URL = f"http://{IP}:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = f"http://{IP}:9998/ocr/prediction"
