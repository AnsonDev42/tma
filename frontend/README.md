# TMA Frontend

React + TypeScript + Vite frontend for menu image analysis.

## Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check
```

## E2E (Playwright)

Install browser runtime once:

```bash
pnpm exec playwright install chromium
```

Run tests:

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
pnpm test:e2e:report
```

E2E auth bypass is enabled only inside `playwright.config.ts` via `VITE_E2E_AUTH_BYPASS=true`.

## Benchmark Debug Page

Set:

```bash
VITE_DEBUG_TOOLS=true
```

Then open:

```text
/debug/benchmark
```

The page reads benchmark artifacts from backend debug endpoints:

- `GET /debug/benchmark/runs`
- `GET /debug/benchmark/runs/{run_id}/summary`
- `GET /debug/benchmark/runs/{run_id}/cases/{case_id}`
- `GET /debug/benchmark/runs/{run_id}/cases/{case_id}/image`

## Capture Deterministic Demo Output

Use this when you have a raw `/menu/analyze` response and want a stable JSON file for `public/` demos.

```bash
pnpm capture-demo-output --input ./tmp/analyze-response.json --output ./public/demoDataNew.json
```

Aliases:

```bash
pnpm catpure-demo-output --input ./tmp/analyze-response.json --output ./public/demoDataNew.json
```

Optional flags:

- `--stdout` print output to terminal
- `--precision <digits>` round bounding boxes (default: `6`)
- `--input -` read JSON from stdin
