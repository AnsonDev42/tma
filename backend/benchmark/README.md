# Benchmark Framework

This folder contains a reusable benchmark framework for OCR/grouping strategy comparisons.

## What it benchmarks

- OCR extraction latency (`run_dip`)
- Grouping strategies:
  - `heuristic`
  - `hybrid`
  - `llm` (forced LLM grouping)
- Optional final extraction latency/result payload per strategy
- Optional pseudo-accuracy metrics against a reference menu JSON

## Manifest format

See `benchmark/manifests/demo_manifest.json`.

```json
{
  "name": "demo-batch",
  "language": "en",
  "cases": [
    {
      "id": "demo-menu-1",
      "imagePath": "../../frontend/public/demoMenu1.jpg",
      "referenceResultPath": "../../frontend/public/demoDataEN.json"
    }
  ]
}
```

Paths are resolved relative to the manifest file.

## Run benchmark

```bash
cd backend
PYTHONPATH=. uv run python benchmark/run.py \
  --manifest benchmark/manifests/demo_manifest.json \
  --output benchmark/output \
  --strategies heuristic,hybrid,llm \
  --llm-reasoning-effort minimal \
  --hybrid-timeout-seconds 8 \
  --forced-llm-timeout-seconds 30
```

`--llm-reasoning-effort` defaults to `minimal`.

Optional final result generation:

```bash
cd backend
PYTHONPATH=. uv run python benchmark/run.py \
  --manifest benchmark/manifests/demo_manifest.json \
  --output benchmark/output \
  --include-final-results \
  --final-max-lines 80
```

## Output artifacts

For each run: `benchmark/output/<run_id>/`

- `summary.json`: aggregate metrics
- `summary.csv`: per-case/per-strategy metrics
- `run_config.json`: exact runtime config
- `cases/<case_id>/case_report.json`: complete debug payload
- `cases/<case_id>/ocr_lines.json`
- `cases/<case_id>/input_image.<ext>`

The frontend debug page reads these artifacts through backend debug endpoints.
