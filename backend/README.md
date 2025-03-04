# install UV and install dependencies

[Install uv](https://docs.astral.sh/uv/getting-started/installation/#scoop)

Run ```uv sync``` to install dependencies

# Run locally

```uvicorn src.main:app --reload --log-config=log_conf.yaml```

# Run in docker compose

```docker-compose up --build```