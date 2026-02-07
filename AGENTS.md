# AGENTS.md

This file is the operational runbook for contributors and coding agents in this repo.

## Repository Map

- `backend/`: FastAPI service (Python 3.13, `uv`)
- `frontend/`: React + TypeScript + Vite app (`pnpm`)
- `infrastructure/`: Terraform/docker infrastructure assets

## Setup Workflow

Run once after cloning (or when lockfiles change):

```bash
cd backend
uv sync
cd ../frontend
pnpm install
```

## Daily Development Workflows

### 1) Backend API (local)

```bash
cd backend
uv run uvicorn src.main:app --reload
```

### 2) Frontend app (local)

```bash
cd frontend
pnpm dev
```

Vite dev uses `http://localhost:8000` for API calls (see `frontend/vite.config.ts`).

### 3) Backend with Docker Compose

```bash
cd backend
docker compose up --build
```

## Verification and Quality Commands

### Backend

- Run tests:

```bash
cd backend
uv run python -m pytest -q
```

Required test env defaults are auto-injected by `pytest-env` from `backend/pyproject.toml`.

- Run linter:

```bash
cd backend
uv run ruff check .
```

### Frontend

- Static checks:

```bash
cd frontend
pnpm check
```

- Build:

```bash
cd frontend
pnpm build
```

- Preview production build:

```bash
cd frontend
pnpm preview
```

### Frontend E2E (Playwright)

Install browser runtime once:

```bash
cd frontend
pnpm exec playwright install chromium
```

Run suites:

```bash
cd frontend
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
pnpm test:e2e:report
```

## Benchmark and Debug Workflows

### Bulk benchmark pipeline

```bash
cd backend
PYTHONPATH=. uv run python benchmark/run.py \
  --manifest benchmark/manifests/demo_manifest.json \
  --output benchmark/output \
  --strategies heuristic,hybrid,llm,layout_llm \
  --llm-reasoning-effort minimal \
  --hybrid-timeout-seconds 8 \
  --forced-llm-timeout-seconds 30
```

Optional final extraction benchmark pass:

```bash
cd backend
PYTHONPATH=. uv run python benchmark/run.py \
  --manifest benchmark/manifests/demo_manifest.json \
  --output benchmark/output \
  --include-final-results \
  --final-max-lines 80
```

### OCR grouping micro-benchmark script

```bash
cd backend
PYTHONPATH=. uv run python scripts/src/services/ocr/benchmark_grouping_modes.py \
  --fixture scripts/src/services/ocr/fixture_dip_results.json \
  --repeats 3 \
  --modes heuristic_only,llm_only,hybrid
```

### Benchmark debug UI workflow

1. Enable backend debug endpoints with `DEBUG_TOOLS_ENABLED=true`.
2. Enable frontend debug page with `VITE_DEBUG_TOOLS=true`.
3. Open `/debug/benchmark` in the frontend app.

Backend debug endpoints used by the page:

- `GET /debug/benchmark/runs`
- `GET /debug/benchmark/runs/{run_id}/summary`
- `GET /debug/benchmark/runs/{run_id}/cases/{case_id}`
- `GET /debug/benchmark/runs/{run_id}/cases/{case_id}/image`

### Capture deterministic frontend demo JSON

```bash
cd frontend
pnpm capture-demo-output --input ./tmp/analyze-response.json --output ./public/demoDataNew.json
```

Alias (typo preserved for compatibility):

```bash
cd frontend
pnpm catpure-demo-output --input ./tmp/analyze-response.json --output ./public/demoDataNew.json
```

## CI Workflow Parity

GitHub Actions (`.github/workflows/deploy.yml`) runs on push/PR to `main`:

1. Gitleaks scan
2. Backend tests (`uv sync --frozen`, then `uv run python -m pytest -q`)
3. Backend Docker build check:

```bash
docker build -t tma-backend-ci ./backend
```

## Backend Env Vars (Most Important)

Required for app startup:

- `OPENAI_API_KEY`
- `AZURE_DIP_API_KEY`
- `AZURE_DIP_BASE_URL`
- `GOOGLE_IMG_SEARCH_CX`
- `GOOGLE_IMG_SEARCH_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FATSECRET_TOKEN_URL`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `FATSECRET_BASE_URL`

Useful toggles:

- `DEBUG_TOOLS_ENABLED`
- `BENCHMARK_OUTPUT_DIR`
- `MENU_DEFAULT_FLOW_ID`
- `MENU_ENABLED_FLOW_IDS`
- `MENU_FLOW_ALIASES`
