import json
from pathlib import Path

import cv2
import numpy as np


def _write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload))


def test_debug_benchmark_runs_disabled_by_default(client, monkeypatch):
    monkeypatch.setattr("src.api.debug.settings.DEBUG_TOOLS_ENABLED", False)
    response = client.get("/debug/benchmark/runs")
    assert response.status_code == 404


def test_debug_benchmark_endpoints_with_sample_artifacts(client, monkeypatch, tmp_path):
    run_id = "20260207T123000Z_demo"
    case_id = "sample-case"
    output_root = tmp_path / "benchmark-output"
    run_dir = output_root / run_id
    case_dir = run_dir / "cases" / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    image = np.zeros((60, 120, 3), dtype=np.uint8)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    image_path = case_dir / "input_image.jpg"
    image_path.write_bytes(encoded.tobytes())

    summary_payload = {
        "runId": run_id,
        "createdAt": "2026-02-07T12:30:00Z",
        "durationMs": 1234.5,
        "strategies": ["heuristic", "hybrid", "llm"],
        "cases": [{"caseId": case_id, "ocrLineCount": 2}],
        "stats": {"totalCases": 1, "strategies": {}},
    }
    case_payload = {
        "caseId": case_id,
        "image": {
            "artifactPath": f"cases/{case_id}/input_image.jpg",
            "processedWidth": 120,
            "processedHeight": 60,
        },
        "ocr": {"lineCount": 2, "lines": []},
        "strategies": {},
    }

    _write_json(run_dir / "summary.json", summary_payload)
    _write_json(case_dir / "case_report.json", case_payload)

    monkeypatch.setattr("src.api.debug.settings.DEBUG_TOOLS_ENABLED", True)
    monkeypatch.setattr(
        "src.api.debug.settings.BENCHMARK_OUTPUT_DIR",
        str(output_root),
    )

    runs_response = client.get("/debug/benchmark/runs")
    assert runs_response.status_code == 200
    runs_payload = runs_response.json()
    assert runs_payload["runs"][0]["runId"] == run_id

    summary_response = client.get(f"/debug/benchmark/runs/{run_id}/summary")
    assert summary_response.status_code == 200
    assert summary_response.json()["runId"] == run_id

    case_response = client.get(f"/debug/benchmark/runs/{run_id}/cases/{case_id}")
    assert case_response.status_code == 200
    assert case_response.json()["caseId"] == case_id

    image_response = client.get(
        f"/debug/benchmark/runs/{run_id}/cases/{case_id}/image"
    )
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/jpeg"
