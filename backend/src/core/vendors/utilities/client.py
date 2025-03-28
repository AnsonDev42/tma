import socket
from src.services.utils import build_search_chain, build_recommendation_chain
from loguru import logger
logger = logger
chain = build_search_chain(model="gpt-4o-mini")
recommendation_chain = build_recommendation_chain(model="gpt-4o-mini")
IP="anson-eq.local"
try:
    IP = socket.gethostbyname("anson-eq.local")
except socket.gaierror:
    logger.error("Could not resolve hostname, using default hostname")

WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = f"http://{IP}:9998/ocr/prediction"
