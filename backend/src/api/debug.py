import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from src.api.deps import get_user
from src.core.config import settings
from src.models import User

router = APIRouter(prefix="/debug", tags=["debug"])

_SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


def _ensure_debug_tools_enabled() -> None:
    if not settings.DEBUG_TOOLS_ENABLED:
        raise HTTPException(status_code=404, detail="Debug tools are disabled")


def _benchmark_output_root() -> Path:
    configured = Path(settings.BENCHMARK_OUTPUT_DIR)
    if configured.is_absolute():
        return configured
    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / configured).resolve()


def _validate_name(raw: str, label: str) -> str:
    if not _SAFE_NAME.fullmatch(raw):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")
    return raw


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Missing file: {path.name}")
    return json.loads(path.read_text())


def _resolve_run_dir(run_id: str) -> Path:
    cleaned = _validate_name(run_id, "run id")
    run_dir = _benchmark_output_root() / cleaned
    if not run_dir.exists() or not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="Run not found")
    return run_dir


def _resolve_case_dir(run_dir: Path, case_id: str) -> Path:
    cleaned = _validate_name(case_id, "case id")
    case_dir = run_dir / "cases" / cleaned
    if not case_dir.exists() or not case_dir.is_dir():
        raise HTTPException(status_code=404, detail="Case not found")
    return case_dir


@router.get("/benchmark/runs")
async def list_benchmark_runs(_user: User = Depends(get_user)):
    _ensure_debug_tools_enabled()
    root = _benchmark_output_root()
    if not root.exists():
        return {"runs": []}

    runs = []
    for run_dir in sorted(
        [path for path in root.iterdir() if path.is_dir()],
        key=lambda path: path.name,
        reverse=True,
    ):
        summary_path = run_dir / "summary.json"
        if not summary_path.exists():
            continue
        summary = _read_json(summary_path)
        runs.append(
            {
                "runId": run_dir.name,
                "createdAt": summary.get("createdAt"),
                "durationMs": summary.get("durationMs"),
                "caseCount": len(summary.get("cases", [])),
                "strategies": summary.get("strategies", []),
            }
        )
    return {"runs": runs}


@router.get("/benchmark/runs/{run_id}/summary")
async def get_benchmark_run_summary(
    run_id: str,
    _user: User = Depends(get_user),
):
    _ensure_debug_tools_enabled()
    run_dir = _resolve_run_dir(run_id)
    return _read_json(run_dir / "summary.json")


@router.get("/benchmark/runs/{run_id}/cases/{case_id}")
async def get_benchmark_case_report(
    run_id: str,
    case_id: str,
    _user: User = Depends(get_user),
):
    _ensure_debug_tools_enabled()
    run_dir = _resolve_run_dir(run_id)
    case_dir = _resolve_case_dir(run_dir, case_id)
    return _read_json(case_dir / "case_report.json")


@router.get("/benchmark/runs/{run_id}/cases/{case_id}/image")
async def get_benchmark_case_image(
    run_id: str,
    case_id: str,
    _user: User = Depends(get_user),
):
    _ensure_debug_tools_enabled()
    run_dir = _resolve_run_dir(run_id)
    case_dir = _resolve_case_dir(run_dir, case_id)
    case_report = _read_json(case_dir / "case_report.json")
    artifact_path = case_report.get("image", {}).get("artifactPath")
    if not artifact_path:
        raise HTTPException(status_code=404, detail="Image artifact not found")

    image_path = (run_dir / artifact_path).resolve()
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image artifact not found")

    return FileResponse(path=image_path)
