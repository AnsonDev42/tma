from loguru import logger

from src.services.utils import build_recommendation_chain, build_search_chain

logger = logger
chain = build_search_chain()
recommendation_chain = build_recommendation_chain()
