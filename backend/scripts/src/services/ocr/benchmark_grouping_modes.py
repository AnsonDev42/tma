import argparse
import asyncio
import copy
import json
import time
from pathlib import Path
from statistics import mean

from src.services.ocr.build_paragraph import _group_with_llm, build_paragraph
from src.services.ocr.line_grouping import build_line_features, heuristic_group_lines


def _p95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, int(0.95 * len(ordered)) - 1)
    return ordered[index]


async def _run_mode_once(mode: str, dip_lines: list[dict]) -> float:
    lines = copy.deepcopy(dip_lines)
    start = time.perf_counter()

    if mode == "heuristic_only":
        features = build_line_features(lines)
        heuristic_group_lines(features)
    elif mode == "llm_only":
        features = build_line_features(lines)
        await _group_with_llm(features)
    elif mode == "hybrid":
        await build_paragraph(lines)
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    return time.perf_counter() - start


async def benchmark_modes(
    dip_lines: list[dict],
    repeats: int,
    modes: list[str],
) -> tuple[dict[str, list[float]], dict[str, int]]:
    timings: dict[str, list[float]] = {mode: [] for mode in modes}
    failures: dict[str, int] = {mode: 0 for mode in modes}
    for mode in modes:
        for _ in range(repeats):
            try:
                elapsed = await _run_mode_once(mode, dip_lines)
            except TimeoutError:
                failures[mode] += 1
                continue
            except Exception as exc:
                failures[mode] += 1
                print(f"{mode} run failed: {type(exc).__name__}: {exc}")
                continue
            timings[mode].append(elapsed)
    return timings, failures


def _print_summary(timings: dict[str, list[float]], failures: dict[str, int]) -> None:
    print("mode,avg_s,p95_s,success_runs,failures")
    for mode, values in timings.items():
        if values:
            avg = f"{mean(values):.3f}"
            p95 = f"{_p95(values):.3f}"
        else:
            avg = "n/a"
            p95 = "n/a"
        print(f"{mode},{avg},{p95},{len(values)},{failures.get(mode, 0)}")


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark OCR grouping modes")
    parser.add_argument(
        "--fixture",
        default="scripts/src/services/ocr/fixture_dip_results.json",
        help="Path to fixture JSON containing DIP lines list",
    )
    parser.add_argument(
        "--repeats",
        type=int,
        default=3,
        help="Benchmark repeats per mode",
    )
    parser.add_argument(
        "--modes",
        default="heuristic_only,llm_only,hybrid",
        help="Comma-separated modes",
    )
    args = parser.parse_args()

    fixture_path = Path(args.fixture)
    with fixture_path.open() as handle:
        dip_lines = json.load(handle)

    modes = [mode.strip() for mode in args.modes.split(",") if mode.strip()]
    timings, failures = await benchmark_modes(dip_lines, args.repeats, modes)
    _print_summary(timings, failures)


if __name__ == "__main__":
    asyncio.run(_main())
