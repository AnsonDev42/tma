from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.api import api_router
from src.core.config import settings
from src.core.vendors.fatsecret.client import FatSecretClient
from src.core.vendors.supabase.client import SupabaseClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    await SupabaseClient.initialize()
    FatSecretClient()
    yield


app = FastAPI(lifespan=lifespan)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_origin_regex=(settings.BACKEND_CORS_ORIGINS_REGEX),
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router)
