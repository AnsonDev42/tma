import logging
import socket

from src.services.utils import build_search_chain

logger = logging.getLogger(__name__)

chain = build_search_chain(model="gpt-4o")

try:
    IP = socket.gethostbyname("anson-eq.local")
except socket.gaierror:
    IP = "anson-eq.local"
    logger.error("Could not resolve hostname, using default hostname")

WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = f"http://{IP}:9998/ocr/prediction"
