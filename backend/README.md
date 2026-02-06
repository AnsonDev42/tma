# install UV and install dependencies

[Install uv](https://docs.astral.sh/uv/getting-started/installation/#scoop)

Run ```uv sync``` to install dependencies

# Run locally

## Run the app

```uv run uvicorn src.main:app --reload```

# Run in docker compose

```docker-compose up --build```

# API contracts (BE v3)

## Analyze menu

`POST /menu/analyze`

- Input:
  - `file`: multipart image
  - Optional `flowId` query param (or `X-Menu-Flow` header)
  - Optional `Accept-Language` header
- Output:
  - `results`: list of dishes with `info` and normalized `boundingBox`
  - `meta`: `flowId`, `flowLabel`, `language`, `totalItems`, `contractVersion`

## Flow catalog

`GET /menu/flows`

- Output:
  - `defaultFlowId`
  - `flows[]`: `id`, `label`, `description`, `enabled`

## Recommendations

`POST /menu/recommendations`

- Input:
  - `dishes[]`
  - `additional_info`
  - `language`
- Output:
  - `suggestions`
  - `meta`: `limitReached`, `remainingAccesses`, `contractVersion`

## Flow configuration via env

- `MENU_DEFAULT_FLOW_ID` (default: `dip.auto_group.v1`)
- `MENU_ENABLED_FLOW_IDS` (default: `dip.auto_group.v1,dip.lines_only.v1`)
- `MENU_FLOW_ALIASES` (default maps `default`, `legacy`, `fast`)
