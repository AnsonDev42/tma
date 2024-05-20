from fastapi import APIRouter

from src.api import root, menu

api_router = APIRouter()

api_router.include_router(root.router)
api_router.include_router(menu.router)
