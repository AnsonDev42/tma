import argparse
import asyncio
import copy
import csv
import json
import re
import shutil
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path
from statistics import mean
from typing import Any, Literal

from src.core.config import settings
from src.services.menu import (
    normalize_text_bbox_dip,
    process_dip_paragraph_results,
    process_dip_results,
    process_image,
    run_dip,
    serialize_dish_data_filtered,
)
from src.services.ocr.build_paragraph import _group_with_llm, build_paragraph
from src.services.ocr.line_grouping import build_line_features, heuristic_group_lines

StrategyName = Literal["heuristic", "hybrid", "llm"]
SUPPORTED_STRATEGIES: tuple[StrategyName, ...] = ("heuristic", "hybrid", "llm")
SUPPORTED_REASONING_EFFORTS = ("none", "minimal", "low", "medium", "high")


@dataclass(frozen=True, slots=True)
class CaseSpec:
    case_id: str
    image_path: Path
    reference_path: Path | None
    notes: str | None


def _slug(value: str) -> str:
    candidate = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip())
    candidate = candidate.strip("-")
    return candidate or "case"


def _p50(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[(len(ordered) - 1) // 2]


def _p95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round(0.95 * len(ordered))) - 1))
    return ordered[idx]


def _bbox_from_polygon(
    polygon: dict[str, list[float]],
    width: int,
    height: int,
) -> dict[str, float]:
    x_coords = [float(v) for v in polygon["x_coords"]]
    y_coords = [float(v) for v in polygon["y_coords"]]
    x_min = min(x_coords)
    x_max = max(x_coords)
    y_min = min(y_coords)
    y_max = max(y_coords)
    return {
        "x": round(x_min / width, 6),
        "y": round(y_min / height, 6),
        "w": round((x_max - x_min) / width, 6),
        "h": round((y_max - y_min) / height, 6),
    }


def _normalize_name(text: str) -> str:
    cleaned = re.sub(r"[^0-9A-Za-z\u3040-\u30ff\u3400-\u9fff]+", "", text or "")
    return cleaned.lower()


def _is_reference_dish_line(line_text: str, reference_names: list[str]) -> bool:
    normalized_line = _normalize_name(line_text)
    if not normalized_line:
        return False

    best_score = 0.0
    for reference in reference_names:
        if not reference:
            continue
        if len(reference) >= 4 and reference in normalized_line:
            return True
        if len(normalized_line) >= 4 and normalized_line in reference:
            return True

        score = SequenceMatcher(None, normalized_line, reference).ratio()
        if score > best_score:
            best_score = score

    return best_score >= 0.62


def _evaluate_grouping_accuracy(
    grouped_indices: set[int],
    line_texts: list[str],
    reference_names: list[str],
) -> dict[str, Any] | None:
    if not reference_names:
        return None

    is_dish_line = [
        _is_reference_dish_line(text, reference_names) for text in line_texts
    ]
    non_dish_indices = {idx for idx, val in enumerate(is_dish_line) if not val}

    grouped_total = len(grouped_indices)
    grouped_non_dish = len(grouped_indices & non_dish_indices)
    grouped_dish = grouped_total - grouped_non_dish

    precision_non_dish = grouped_non_dish / grouped_total if grouped_total else 1.0
    recall_non_dish = (
        grouped_non_dish / len(non_dish_indices) if non_dish_indices else 0.0
    )

    return {
        "ocrLines": len(line_texts),
        "matchedDishLines": sum(is_dish_line),
        "nonDishLines": len(non_dish_indices),
        "groupedLines": grouped_total,
        "groupedNonDishLines": grouped_non_dish,
        "groupedDishMistakes": grouped_dish,
        "precisionNonDish": round(precision_non_dish, 4),
        "recallNonDish": round(recall_non_dish, 4),
    }


def _read_reference_names(reference_path: Path | None) -> tuple[list[str], dict[str, Any] | None]:
    if reference_path is None or not reference_path.exists():
        return [], None

    payload = json.loads(reference_path.read_text())
    results = payload.get("results", [])
    names = [_normalize_name(item.get("info", {}).get("text", "")) for item in results]
    names = [name for name in names if name]
    reference_meta = {
        "path": str(reference_path),
        "totalItems": len(results),
    }
    return names, reference_meta


def _materialize_paragraphs(
    dip_lines: list[dict],
    groups: list[list[int]],
) -> tuple[list[dict], list[dict], list[int]]:
    grouped_indices: set[int] = set()
    paragraph_lines: list[dict] = []

    for group in groups:
        valid_indices = sorted(
            {idx for idx in group if 0 <= idx < len(dip_lines) and idx not in grouped_indices}
        )
        if not valid_indices:
            continue

        content_parts: list[str] = []
        tmp_polygon = {"x_coords": [], "y_coords": []}
        for idx in valid_indices:
            grouped_indices.add(idx)
            content_parts.append(str(dip_lines[idx]["content"]).strip())
            tmp_polygon["x_coords"] += [float(v) for v in dip_lines[idx]["polygon"]["x_coords"]]
            tmp_polygon["y_coords"] += [float(v) for v in dip_lines[idx]["polygon"]["y_coords"]]

        content = " ".join(part for part in content_parts if part).strip()
        if content:
            paragraph_lines.append({"content": content, "polygon": tmp_polygon})

    individual_lines = [
        line for idx, line in enumerate(dip_lines) if idx not in grouped_indices
    ]
    return paragraph_lines, individual_lines, sorted(grouped_indices)


async def _run_strategy(
    strategy: StrategyName,
    *,
    dip_lines: list[dict],
    reference_names: list[str],
    processed_width: int,
    processed_height: int,
    language: str,
    include_final_results: bool,
    final_max_lines: int,
    forced_llm_timeout_seconds: int,
) -> dict[str, Any]:
    strategy_input = copy.deepcopy(dip_lines)
    line_texts = [line["content"] for line in strategy_input]
    group_list: list[list[int]] = []
    paragraph_lines: list[dict] = []
    individual_lines: list[dict] = strategy_input

    status = "ok"
    error_message: str | None = None
    timeout = False
    notes: list[str] = []
    started = time.perf_counter()

    try:
        if strategy == "heuristic":
            features = build_line_features(strategy_input)
            decision = heuristic_group_lines(features)
            group_list = decision.groups
            paragraph_lines, individual_lines, _ = _materialize_paragraphs(
                strategy_input, group_list
            )
            notes.extend(decision.ambiguous_reasons)
        elif strategy == "hybrid":
            paragraph_lines, individual_lines = await build_paragraph(strategy_input)
            individual_indices = {
                int(line["index"])
                for line in individual_lines
                if isinstance(line, dict) and "index" in line
            }
            grouped_indices = set(range(len(strategy_input))) - individual_indices
            if grouped_indices:
                group_list = [sorted(grouped_indices)]
        elif strategy == "llm":
            features = build_line_features(strategy_input)
            previous_timeout = settings.MENU_GROUPING_TIMEOUT_SECONDS
            settings.MENU_GROUPING_TIMEOUT_SECONDS = forced_llm_timeout_seconds
            try:
                llm_groups = await _group_with_llm(features)
                group_list = llm_groups or []
                paragraph_lines, individual_lines, _ = _materialize_paragraphs(
                    strategy_input, group_list
                )
            finally:
                settings.MENU_GROUPING_TIMEOUT_SECONDS = previous_timeout
        else:
            raise ValueError(f"Unsupported strategy: {strategy}")
    except TimeoutError:
        timeout = True
        status = "timeout"
        error_message = "Grouping timed out"
        paragraph_lines = []
        individual_lines = strategy_input
        group_list = []
    except Exception as exc:  # defensive
        status = "error"
        error_message = f"{type(exc).__name__}: {exc}"
        paragraph_lines = []
        individual_lines = strategy_input
        group_list = []

    latency_ms = round((time.perf_counter() - started) * 1000, 3)
    grouped_indices = sorted({idx for group in group_list for idx in group})
    accuracy = _evaluate_grouping_accuracy(set(grouped_indices), line_texts, reference_names)

    final_result_payload: dict[str, Any] | None = None
    if include_final_results:
        final_started = time.perf_counter()
        final_status = "ok"
        final_error: str | None = None
        final_results: list[dict] = []
        if len(individual_lines) + len(paragraph_lines) > final_max_lines:
            final_status = "skipped"
            final_error = (
                f"Skipped final extraction: line count exceeds final_max_lines={final_max_lines}"
            )
        else:
            try:
                dish_info_task = process_dip_results(individual_lines, language)
                paragraph_task = process_dip_paragraph_results(paragraph_lines, language)
                dish_info, paragraph_info = await asyncio.gather(
                    dish_info_task, paragraph_task
                )
                dish_boxes = normalize_text_bbox_dip(
                    processed_width, processed_height, individual_lines
                )
                paragraph_boxes = normalize_text_bbox_dip(
                    processed_width, processed_height, paragraph_lines
                )
                dish_info.extend(paragraph_info)
                dish_boxes.extend(paragraph_boxes)
                final_results = serialize_dish_data_filtered(dish_info, dish_boxes)
            except Exception as exc:  # defensive
                final_status = "error"
                final_error = f"{type(exc).__name__}: {exc}"

        final_result_payload = {
            "status": final_status,
            "latencyMs": round((time.perf_counter() - final_started) * 1000, 3),
            "error": final_error,
            "results": final_results,
            "totalItems": len(final_results),
        }

    paragraph_bboxes = [
        _bbox_from_polygon(item["polygon"], processed_width, processed_height)
        for item in paragraph_lines
    ]

    return {
        "strategy": strategy,
        "status": status,
        "timedOut": timeout,
        "latencyMs": latency_ms,
        "error": error_message,
        "notes": notes,
        "groupCount": len(group_list),
        "groupedLineCount": len(grouped_indices),
        "groupedLineIndices": grouped_indices,
        "groups": group_list,
        "paragraphCount": len(paragraph_lines),
        "individualCount": len(individual_lines),
        "paragraphs": [
            {"content": paragraph_lines[idx]["content"], "bbox": paragraph_bboxes[idx]}
            for idx in range(len(paragraph_lines))
        ],
        "accuracy": accuracy,
        "final": final_result_payload,
    }


def _resolve_case_specs(manifest_path: Path, manifest_payload: dict[str, Any]) -> list[CaseSpec]:
    base_dir = manifest_path.parent
    specs: list[CaseSpec] = []
    for raw_case in manifest_payload.get("cases", []):
        case_id = _slug(raw_case.get("id") or raw_case.get("name") or "case")
        image_path = (base_dir / raw_case["imagePath"]).resolve()
        reference_path = raw_case.get("referenceResultPath")
        resolved_reference = (base_dir / reference_path).resolve() if reference_path else None
        specs.append(
            CaseSpec(
                case_id=case_id,
                image_path=image_path,
                reference_path=resolved_reference,
                notes=raw_case.get("notes"),
            )
        )
    return specs


def _prepare_ocr_debug_lines(
    dip_lines: list[dict],
    processed_width: int,
    processed_height: int,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for idx, line in enumerate(dip_lines):
        output.append(
            {
                "index": idx,
                "content": line["content"],
                "bbox": _bbox_from_polygon(
                    line["polygon"], processed_width, processed_height
                ),
            }
        )
    return output


def _write_json(path: Path, payload: dict[str, Any] | list[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def _summarize_run(case_reports: list[dict[str, Any]], strategies: list[StrategyName]) -> dict[str, Any]:
    strategy_summary: dict[str, Any] = {}
    for strategy in strategies:
        matching = [
            case["strategies"][strategy]
            for case in case_reports
            if strategy in case["strategies"]
        ]
        latencies = [entry["latencyMs"] for entry in matching if entry["status"] == "ok"]
        timeouts = sum(1 for entry in matching if entry["status"] == "timeout")
        errors = sum(1 for entry in matching if entry["status"] == "error")

        precision_values = [
            entry["accuracy"]["precisionNonDish"]
            for entry in matching
            if entry.get("accuracy")
        ]
        recall_values = [
            entry["accuracy"]["recallNonDish"]
            for entry in matching
            if entry.get("accuracy")
        ]

        strategy_summary[strategy] = {
            "totalCases": len(matching),
            "okCases": len(latencies),
            "timeoutCases": timeouts,
            "errorCases": errors,
            "avgLatencyMs": round(mean(latencies), 3) if latencies else None,
            "p50LatencyMs": round(_p50(latencies), 3) if latencies else None,
            "p95LatencyMs": round(_p95(latencies), 3) if latencies else None,
            "avgPrecisionNonDish": round(mean(precision_values), 4)
            if precision_values
            else None,
            "avgRecallNonDish": round(mean(recall_values), 4)
            if recall_values
            else None,
        }

    return {
        "totalCases": len(case_reports),
        "strategies": strategy_summary,
    }


def _write_summary_csv(
    output_path: Path,
    case_reports: list[dict[str, Any]],
    strategies: list[StrategyName],
) -> None:
    fieldnames = [
        "caseId",
        "strategy",
        "status",
        "latencyMs",
        "groupCount",
        "groupedLineCount",
        "paragraphCount",
        "individualCount",
        "precisionNonDish",
        "recallNonDish",
        "finalStatus",
        "finalLatencyMs",
        "finalTotalItems",
    ]
    with output_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for case in case_reports:
            for strategy in strategies:
                result = case["strategies"].get(strategy)
                if not result:
                    continue
                accuracy = result.get("accuracy") or {}
                final = result.get("final") or {}
                writer.writerow(
                    {
                        "caseId": case["caseId"],
                        "strategy": strategy,
                        "status": result.get("status"),
                        "latencyMs": result.get("latencyMs"),
                        "groupCount": result.get("groupCount"),
                        "groupedLineCount": result.get("groupedLineCount"),
                        "paragraphCount": result.get("paragraphCount"),
                        "individualCount": result.get("individualCount"),
                        "precisionNonDish": accuracy.get("precisionNonDish"),
                        "recallNonDish": accuracy.get("recallNonDish"),
                        "finalStatus": final.get("status"),
                        "finalLatencyMs": final.get("latencyMs"),
                        "finalTotalItems": final.get("totalItems"),
                    }
                )


async def _run_case(
    case: CaseSpec,
    *,
    strategies: list[StrategyName],
    language: str,
    include_final_results: bool,
    final_max_lines: int,
    forced_llm_timeout_seconds: int,
    run_dir: Path,
) -> dict[str, Any]:
    image_bytes = case.image_path.read_bytes()
    processed_image, processed_height, processed_width = process_image(image_bytes)
    ocr_lines = await run_dip(processed_image)

    reference_names, reference_meta = _read_reference_names(case.reference_path)
    ocr_debug_lines = _prepare_ocr_debug_lines(ocr_lines, processed_width, processed_height)

    case_dir = run_dir / "cases" / case.case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    image_target = case_dir / f"input_image{case.image_path.suffix.lower()}"
    shutil.copy2(case.image_path, image_target)

    strategies_payload: dict[str, Any] = {}
    for strategy in strategies:
        strategy_payload = await _run_strategy(
            strategy,
            dip_lines=ocr_lines,
            reference_names=reference_names,
            processed_width=processed_width,
            processed_height=processed_height,
            language=language,
            include_final_results=include_final_results,
            final_max_lines=final_max_lines,
            forced_llm_timeout_seconds=forced_llm_timeout_seconds,
        )
        strategies_payload[strategy] = strategy_payload

    case_report = {
        "caseId": case.case_id,
        "notes": case.notes,
        "image": {
            "sourcePath": str(case.image_path),
            "artifactPath": str(image_target.relative_to(run_dir)),
            "processedWidth": processed_width,
            "processedHeight": processed_height,
        },
        "reference": reference_meta,
        "ocr": {
            "lineCount": len(ocr_debug_lines),
            "lines": ocr_debug_lines,
        },
        "strategies": strategies_payload,
    }

    _write_json(case_dir / "case_report.json", case_report)
    _write_json(case_dir / "ocr_lines.json", ocr_debug_lines)
    if case.reference_path and case.reference_path.exists():
        _write_json(
            case_dir / "reference_results.json",
            json.loads(case.reference_path.read_text()),
        )

    return case_report


async def run_benchmark(args: argparse.Namespace) -> int:
    manifest_path = Path(args.manifest).resolve()
    manifest_payload = json.loads(manifest_path.read_text())
    run_name = _slug(manifest_payload.get("name") or "benchmark")
    run_id = f"{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}_{run_name}"

    output_root = Path(args.output).resolve()
    run_dir = output_root / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    strategy_input = [part.strip().lower() for part in args.strategies.split(",") if part.strip()]
    strategies: list[StrategyName] = [
        strategy  # type: ignore[arg-type]
        for strategy in strategy_input
        if strategy in SUPPORTED_STRATEGIES
    ]
    if not strategies:
        raise ValueError("No valid strategies provided")

    case_specs = _resolve_case_specs(manifest_path, manifest_payload)
    if not case_specs:
        raise ValueError("No benchmark cases found in manifest")

    previous_timeout = settings.MENU_GROUPING_TIMEOUT_SECONDS
    previous_threshold = settings.MENU_GROUPING_LLM_LINE_THRESHOLD
    previous_image_max = settings.MENU_IMAGE_ENRICH_MAX_ITEMS
    previous_reasoning_effort = settings.MENU_GROUPING_LLM_REASONING_EFFORT
    selected_reasoning_effort = args.llm_reasoning_effort.strip().lower()
    settings.MENU_GROUPING_TIMEOUT_SECONDS = args.hybrid_timeout_seconds
    settings.MENU_GROUPING_LLM_LINE_THRESHOLD = args.llm_line_threshold
    settings.MENU_IMAGE_ENRICH_MAX_ITEMS = args.image_enrich_max_items
    settings.MENU_GROUPING_LLM_REASONING_EFFORT = (
        "" if selected_reasoning_effort == "none" else selected_reasoning_effort
    )

    started = time.perf_counter()
    case_reports: list[dict[str, Any]] = []
    try:
        for case in case_specs:
            print(f"[benchmark] running case={case.case_id}")
            report = await _run_case(
                case,
                strategies=strategies,
                language=manifest_payload.get("language", "en"),
                include_final_results=args.include_final_results,
                final_max_lines=args.final_max_lines,
                forced_llm_timeout_seconds=args.forced_llm_timeout_seconds,
                run_dir=run_dir,
            )
            case_reports.append(report)
    finally:
        settings.MENU_GROUPING_TIMEOUT_SECONDS = previous_timeout
        settings.MENU_GROUPING_LLM_LINE_THRESHOLD = previous_threshold
        settings.MENU_IMAGE_ENRICH_MAX_ITEMS = previous_image_max
        settings.MENU_GROUPING_LLM_REASONING_EFFORT = previous_reasoning_effort

    summary_stats = _summarize_run(case_reports, strategies)
    finished_at = datetime.now(UTC)
    summary = {
        "runId": run_id,
        "createdAt": finished_at.isoformat(),
        "durationMs": round((time.perf_counter() - started) * 1000, 3),
        "manifestPath": str(manifest_path),
        "outputPath": str(run_dir),
        "language": manifest_payload.get("language", "en"),
        "strategies": strategies,
        "cases": [
            {
                "caseId": case["caseId"],
                "ocrLineCount": case["ocr"]["lineCount"],
                "strategyStatus": {
                    strategy: case["strategies"][strategy]["status"]
                    for strategy in strategies
                },
            }
            for case in case_reports
        ],
        "stats": summary_stats,
    }

    _write_json(
        run_dir / "run_config.json",
        {
            "manifest": str(manifest_path),
            "output": str(run_dir),
            "strategies": strategies,
            "hybridTimeoutSeconds": args.hybrid_timeout_seconds,
            "forcedLlmTimeoutSeconds": args.forced_llm_timeout_seconds,
            "llmLineThreshold": args.llm_line_threshold,
            "includeFinalResults": args.include_final_results,
            "finalMaxLines": args.final_max_lines,
            "imageEnrichMaxItems": args.image_enrich_max_items,
            "llmReasoningEffort": selected_reasoning_effort,
        },
    )
    _write_json(run_dir / "summary.json", summary)
    _write_summary_csv(run_dir / "summary.csv", case_reports, strategies)

    print(f"[benchmark] run complete: {run_id}")
    print(f"[benchmark] summary: {run_dir / 'summary.json'}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bulk benchmark for OCR grouping strategies")
    parser.add_argument(
        "--manifest",
        required=True,
        help="Path to benchmark manifest JSON",
    )
    parser.add_argument(
        "--output",
        default=str(Path("benchmark") / "output"),
        help="Output root directory",
    )
    parser.add_argument(
        "--strategies",
        default="heuristic,hybrid,llm",
        help=f"Comma-separated strategies ({', '.join(SUPPORTED_STRATEGIES)})",
    )
    parser.add_argument(
        "--hybrid-timeout-seconds",
        type=int,
        default=settings.MENU_GROUPING_TIMEOUT_SECONDS,
        help="Timeout for hybrid strategy LLM grouping",
    )
    parser.add_argument(
        "--forced-llm-timeout-seconds",
        type=int,
        default=max(30, settings.MENU_GROUPING_TIMEOUT_SECONDS),
        help="Timeout for forced LLM strategy",
    )
    parser.add_argument(
        "--llm-line-threshold",
        type=int,
        default=settings.MENU_GROUPING_LLM_LINE_THRESHOLD,
        help="Hybrid threshold: invoke LLM when line count exceeds this value",
    )
    parser.add_argument(
        "--llm-reasoning-effort",
        type=str,
        choices=SUPPORTED_REASONING_EFFORTS,
        default="minimal",
        help="LLM reasoning effort for grouping (default: minimal; use none to omit reasoning override)",
    )
    parser.add_argument(
        "--include-final-results",
        action="store_true",
        help="Run final extraction pipeline for each strategy",
    )
    parser.add_argument(
        "--final-max-lines",
        type=int,
        default=80,
        help="Skip final extraction when total (individual + paragraph) lines exceed this value",
    )
    parser.add_argument(
        "--image-enrich-max-items",
        type=int,
        default=settings.MENU_IMAGE_ENRICH_MAX_ITEMS,
        help="Image enrichment max items override during benchmark",
    )
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(run_benchmark(parse_args()))
