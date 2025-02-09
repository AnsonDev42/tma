FROM python:3.13-slim AS builder
# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
# import the uv command
ENV PATH="/root/.local/bin/:$PATH"

FROM python:3.13-slim

WORKDIR /code

COPY pyproject.toml uv.lock* /code/

RUN uv sync --frozen

COPY ./src /code/src

CMD ["uv","run","uvicorn", "--workers", "4","src.main:app", "--host", "0.0.0.0", "--port", "8000"]
#CMD ["uv","run","gunicorn", "-w", "4", \
#     "-k", "uvicorn.workers.UvicornWorker", "src.main:app", \
#     "--bind", "0.0.0.0:8000"]