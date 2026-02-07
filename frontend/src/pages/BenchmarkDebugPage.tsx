import { useSession } from "@/contexts/SessionContext";
import {
	fetchBenchmarkCaseImageUrl,
	fetchBenchmarkCaseReport,
	fetchBenchmarkRuns,
	fetchBenchmarkSummary,
} from "@/features/debug/services/benchmarkDebugService";
import {
	DebugBenchmarkCaseReport,
	DebugBenchmarkRun,
	DebugBenchmarkSummary,
} from "@/features/debug/types";
import { useEffect, useMemo, useRef, useState } from "react";

const isDebugToolsEnabled = import.meta.env.VITE_DEBUG_TOOLS === "true";

export default function BenchmarkDebugPage() {
	const { session } = useSession();
	const token = session?.access_token;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [runs, setRuns] = useState<DebugBenchmarkRun[]>([]);
	const [selectedRunId, setSelectedRunId] = useState<string>("");
	const [summary, setSummary] = useState<DebugBenchmarkSummary | null>(null);
	const [selectedCaseId, setSelectedCaseId] = useState<string>("");
	const [caseReport, setCaseReport] = useState<DebugBenchmarkCaseReport | null>(
		null,
	);
	const [imageUrl, setImageUrl] = useState<string>("");
	const [selectedStrategy, setSelectedStrategy] = useState<string>("");
	const [showOcrOverlay, setShowOcrOverlay] = useState(true);
	const [showGroupedOverlay, setShowGroupedOverlay] = useState(true);
	const [showFinalOverlay, setShowFinalOverlay] = useState(true);
	const previousImageUrl = useRef<string>("");

	const selectedStrategyResult =
		caseReport && selectedStrategy
			? caseReport.strategies[selectedStrategy]
			: null;
	const groupedLineSet = useMemo(() => {
		const values = selectedStrategyResult?.groupedLineIndices || [];
		return new Set(values);
	}, [selectedStrategyResult]);

	useEffect(() => {
		return () => {
			if (previousImageUrl.current) {
				URL.revokeObjectURL(previousImageUrl.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!token || !isDebugToolsEnabled) {
			return;
		}
		setLoading(true);
		setError("");
		void fetchBenchmarkRuns(token)
			.then((payload) => {
				setRuns(payload.runs || []);
				const firstRun = payload.runs?.[0]?.runId || "";
				setSelectedRunId(firstRun);
			})
			.catch((err: Error) => {
				setError(err.message || "Failed to load benchmark runs");
			})
			.finally(() => {
				setLoading(false);
			});
	}, [token]);

	useEffect(() => {
		if (!token || !selectedRunId) {
			return;
		}
		setLoading(true);
		setError("");
		void fetchBenchmarkSummary(token, selectedRunId)
			.then((payload) => {
				setSummary(payload);
				const firstCase = payload.cases?.[0]?.caseId || "";
				setSelectedCaseId(firstCase);
			})
			.catch((err: Error) => {
				setError(err.message || "Failed to load run summary");
			})
			.finally(() => {
				setLoading(false);
			});
	}, [token, selectedRunId]);

	useEffect(() => {
		if (!token || !selectedRunId || !selectedCaseId) {
			return;
		}
		setLoading(true);
		setError("");
		void Promise.all([
			fetchBenchmarkCaseReport(token, selectedRunId, selectedCaseId),
			fetchBenchmarkCaseImageUrl(token, selectedRunId, selectedCaseId),
		])
			.then(([report, nextImageUrl]) => {
				if (previousImageUrl.current) {
					URL.revokeObjectURL(previousImageUrl.current);
				}
				previousImageUrl.current = nextImageUrl;
				setCaseReport(report);
				setImageUrl(nextImageUrl);

				const strategies = Object.keys(report.strategies || {});
				setSelectedStrategy(strategies[0] || "");
			})
			.catch((err: Error) => {
				setError(err.message || "Failed to load case report");
			})
			.finally(() => {
				setLoading(false);
			});
	}, [token, selectedRunId, selectedCaseId]);

	if (!isDebugToolsEnabled) {
		return (
			<div className="p-6 text-sm text-slate-700">
				Debug tools are disabled. Set `VITE_DEBUG_TOOLS=true`.
			</div>
		);
	}

	if (!token) {
		return (
			<div className="p-6 text-sm text-slate-700">
				Sign in first to access benchmark debug tools.
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
			<div className="mx-auto max-w-7xl space-y-4">
				<div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
					<h1 className="text-lg font-semibold">Benchmark Debug</h1>
					<p className="text-xs text-slate-400">
						Inspect DIP OCR lines, grouping outputs, and final extraction
						overlays.
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-[360px_1fr]">
					<div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
							Run
						</label>
						<select
							value={selectedRunId}
							onChange={(event) => setSelectedRunId(event.target.value)}
							className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
						>
							{runs.map((run) => (
								<option key={run.runId} value={run.runId}>
									{run.runId}
								</option>
							))}
						</select>

						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
							Case
						</label>
						<select
							value={selectedCaseId}
							onChange={(event) => setSelectedCaseId(event.target.value)}
							className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
						>
							{(summary?.cases || []).map((item) => (
								<option key={item.caseId} value={item.caseId}>
									{item.caseId}
								</option>
							))}
						</select>

						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
							Strategy
						</label>
						<select
							value={selectedStrategy}
							onChange={(event) => setSelectedStrategy(event.target.value)}
							className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
						>
							{Object.keys(caseReport?.strategies || {}).map((strategy) => (
								<option key={strategy} value={strategy}>
									{strategy}
								</option>
							))}
						</select>

						<div className="space-y-2 text-xs">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={showOcrOverlay}
									onChange={(event) => setShowOcrOverlay(event.target.checked)}
								/>
								OCR boxes (blue)
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={showGroupedOverlay}
									onChange={(event) =>
										setShowGroupedOverlay(event.target.checked)
									}
								/>
								Grouped boxes (orange)
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={showFinalOverlay}
									onChange={(event) =>
										setShowFinalOverlay(event.target.checked)
									}
								/>
								Final result boxes (green)
							</label>
						</div>

						<div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
							<p>Loading: {loading ? "yes" : "no"}</p>
							{error ? <p className="mt-1 text-rose-400">{error}</p> : null}
							{selectedStrategyResult ? (
								<div className="mt-2 space-y-1 text-slate-300">
									<p>Status: {selectedStrategyResult.status}</p>
									<p>Latency: {selectedStrategyResult.latencyMs} ms</p>
									<p>
										Grouped lines: {selectedStrategyResult.groupedLineCount}
									</p>
									<p>Paragraphs: {selectedStrategyResult.paragraphCount}</p>
									<p>
										Individual lines: {selectedStrategyResult.individualCount}
									</p>
									<p>
										Final items: {selectedStrategyResult.final?.totalItems || 0}
									</p>
								</div>
							) : null}
						</div>
					</div>

					<div className="space-y-4">
						<div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
							<div className="relative overflow-hidden rounded-md border border-slate-700 bg-black/40">
								{imageUrl ? (
									<img
										src={imageUrl}
										alt={`Benchmark case ${selectedCaseId}`}
										className="block h-auto w-full"
									/>
								) : (
									<div className="flex h-80 items-center justify-center text-sm text-slate-400">
										No image loaded
									</div>
								)}

								{imageUrl ? (
									<div className="pointer-events-none absolute inset-0">
										{showOcrOverlay
											? (caseReport?.ocr.lines || []).map((line) => (
													<div
														key={`ocr-${line.index}`}
														title={`${line.index}: ${line.content}`}
														className="absolute border border-cyan-400/70"
														style={{
															left: `${line.bbox.x * 100}%`,
															top: `${line.bbox.y * 100}%`,
															width: `${line.bbox.w * 100}%`,
															height: `${line.bbox.h * 100}%`,
														}}
													/>
												))
											: null}
										{showGroupedOverlay
											? (caseReport?.ocr.lines || [])
													.filter((line) => groupedLineSet.has(line.index))
													.map((line) => (
														<div
															key={`grouped-${line.index}`}
															title={`Grouped ${line.index}: ${line.content}`}
															className="absolute border-2 border-amber-300/90 bg-amber-300/10"
															style={{
																left: `${line.bbox.x * 100}%`,
																top: `${line.bbox.y * 100}%`,
																width: `${line.bbox.w * 100}%`,
																height: `${line.bbox.h * 100}%`,
															}}
														/>
													))
											: null}
										{showFinalOverlay
											? (selectedStrategyResult?.final?.results || [])
													.filter((item) => item.boundingBox)
													.map((item, idx) => {
														const box = item.boundingBox!;
														return (
															<div
																key={`final-${idx}`}
																title={item.info?.text || "final item"}
																className="absolute border-2 border-emerald-400/90 bg-emerald-400/10"
																style={{
																	left: `${box.x * 100}%`,
																	top: `${box.y * 100}%`,
																	width: `${box.w * 100}%`,
																	height: `${box.h * 100}%`,
																}}
															/>
														);
													})
											: null}
									</div>
								) : null}
							</div>
						</div>

						<div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
							<h2 className="text-sm font-semibold text-slate-200">
								Run Strategy Stats
							</h2>
							<div className="mt-2 overflow-x-auto">
								<table className="min-w-full text-xs">
									<thead>
										<tr className="text-left text-slate-400">
											<th className="px-2 py-1">Strategy</th>
											<th className="px-2 py-1">Avg (ms)</th>
											<th className="px-2 py-1">P95 (ms)</th>
											<th className="px-2 py-1">Timeouts</th>
											<th className="px-2 py-1">Errors</th>
										</tr>
									</thead>
									<tbody>
										{Object.entries(summary?.stats?.strategies || {}).map(
											([strategy, stat]) => (
												<tr
													key={strategy}
													className="border-t border-slate-800"
												>
													<td className="px-2 py-1">{strategy}</td>
													<td className="px-2 py-1">
														{stat.avgLatencyMs ?? "-"}
													</td>
													<td className="px-2 py-1">
														{stat.p95LatencyMs ?? "-"}
													</td>
													<td className="px-2 py-1">
														{stat.timeoutCases ?? "-"}
													</td>
													<td className="px-2 py-1">
														{stat.errorCases ?? "-"}
													</td>
												</tr>
											),
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
