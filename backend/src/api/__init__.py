from fastapi import APIRouter

from src.api import root, menu, user, debug

api_router = APIRouter()

api_router.include_router(root.router)
api_router.include_router(menu.router)
api_router.include_router(user.router)
api_router.include_router(debug.router)
