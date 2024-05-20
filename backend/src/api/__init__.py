from fastapi import APIRouter

from src.api import root

api_router = APIRouter()

api_router.include_router(root.router)
