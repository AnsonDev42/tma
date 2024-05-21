import ast
import http
import os
import socket
import time
from io import BytesIO
from typing import NamedTuple, Optional

import pydantic
from jose import jwt
import requests
from fastapi import FastAPI, UploadFile, status, HTTPException, Header, Depends
import json
import base64
import cv2
import numpy as np
import asyncio
import httpx
from dataclasses import dataclass, asdict
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging

from src.api import api_router
from src.core.config import settings

app = FastAPI()

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_origin_regex=settings.BACKEND_CORS_ORIGINS_REGEX,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router)
