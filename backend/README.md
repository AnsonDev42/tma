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
- `MENU_GROUPING_TIMEOUT_SECONDS` (default: `8`)
- `MENU_GROUPING_LLM_LINE_THRESHOLD` (default: `40`)
- `MENU_DISH_FANOUT_CONCURRENCY` (default: `12`)
- `MENU_DISH_FANOUT_ADAPTIVE` (default: `true`)
- `MENU_DISH_FANOUT_MAX_CONCURRENCY` (default: `100`)
- `MENU_IMAGE_ENRICH_MAX_ITEMS` (default: `30`)
- `DEBUG_TOOLS_ENABLED` (default: `false`)
- `BENCHMARK_OUTPUT_DIR` (default: `benchmark/output`)

## Benchmark tools

- Framework: `benchmark/`
- Run bulk benchmark:

```bash
cd backend
PYTHONPATH=. uv run python benchmark/run.py \
  --manifest benchmark/manifests/demo_manifest.json \
  --output benchmark/output \
  --strategies heuristic,hybrid,llm
```

- Optional debug API endpoints (require auth, and `DEBUG_TOOLS_ENABLED=true`):
  - `GET /debug/benchmark/runs`
  - `GET /debug/benchmark/runs/{run_id}/summary`
  - `GET /debug/benchmark/runs/{run_id}/cases/{case_id}`
  - `GET /debug/benchmark/runs/{run_id}/cases/{case_id}/image`
