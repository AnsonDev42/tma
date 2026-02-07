import secrets
from typing import Annotated, Any

from pydantic import AnyUrl, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    SECRET_KEY: str = secrets.token_urlsafe(32)
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-5-nano"
    AZURE_DIP_API_KEY: str
    AZURE_DIP_BASE_URL: str
    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []
    BACKEND_CORS_ORIGINS_REGEX: str | None = None
    GOOGLE_IMG_SEARCH_URL: str = "https://www.googleapis.com/customsearch/v1"
    GOOGLE_IMG_SEARCH_CX: str
    GOOGLE_IMG_SEARCH_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    FATSECRET_TOKEN_URL: str
    FATSECRET_CLIENT_ID: str
    FATSECRET_CLIENT_SECRET: str
    FATSECRET_BASE_URL: str
    MENU_DEFAULT_FLOW_ID: str = "dip.auto_group.v1"
    MENU_ENABLED_FLOW_IDS: str = "dip.auto_group.v1,dip.lines_only.v1"
    MENU_FLOW_ALIASES: str = (
        "default=dip.auto_group.v1,legacy=dip.auto_group.v1,fast=dip.lines_only.v1"
    )
    MENU_GROUPING_TIMEOUT_SECONDS: int = 8
    MENU_GROUPING_LLM_LINE_THRESHOLD: int = 40
    MENU_GROUPING_LLM_REASONING_EFFORT: str = "minimal"
    MENU_DISH_FANOUT_CONCURRENCY: int = 50
    MENU_DISH_FANOUT_ADAPTIVE: bool = True
    MENU_DISH_FANOUT_MAX_CONCURRENCY: int = 100
    MENU_IMAGE_ENRICH_MAX_ITEMS: int = 30
    DEBUG_TOOLS_ENABLED: bool = True
    BENCHMARK_OUTPUT_DIR: str = "benchmark/output"


settings = Settings()
