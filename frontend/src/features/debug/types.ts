export type DebugBenchmarkRun = {
	runId: string;
	createdAt?: string;
	durationMs?: number;
	caseCount?: number;
	strategies?: string[];
};

export type DebugBenchmarkRunListResponse = {
	runs: DebugBenchmarkRun[];
};

export type DebugBenchmarkSummary = {
	runId: string;
	createdAt?: string;
	durationMs?: number;
	strategies?: string[];
	cases?: Array<{
		caseId: string;
		ocrLineCount?: number;
		strategyStatus?: Record<string, string>;
	}>;
	stats?: {
		totalCases?: number;
		strategies?: Record<
			string,
			{
				totalCases?: number;
				okCases?: number;
				timeoutCases?: number;
				errorCases?: number;
				avgLatencyMs?: number | null;
				p50LatencyMs?: number | null;
				p95LatencyMs?: number | null;
				avgPrecisionNonDish?: number | null;
				avgRecallNonDish?: number | null;
			}
		>;
	};
};

export type DebugBenchmarkCaseReport = {
	caseId: string;
	notes?: string | null;
	image: {
		sourcePath?: string;
		artifactPath?: string;
		processedWidth: number;
		processedHeight: number;
	};
	ocr: {
		lineCount: number;
		lines: Array<{
			index: number;
			content: string;
			bbox: {
				x: number;
				y: number;
				w: number;
				h: number;
			};
		}>;
	};
	reference?: {
		path?: string;
		totalItems?: number;
	} | null;
	strategies: Record<
		string,
		{
			strategy: string;
			status: string;
			timedOut: boolean;
			latencyMs: number;
			groupCount: number;
			groupedLineCount: number;
			groupedLineIndices: number[];
			paragraphCount: number;
			individualCount: number;
			accuracy?: {
				precisionNonDish?: number;
				recallNonDish?: number;
			} | null;
			final?: {
				status: string;
				latencyMs: number;
				totalItems: number;
				results: Array<{
					info?: {
						text?: string;
					};
					boundingBox?: {
						x: number;
						y: number;
						w: number;
						h: number;
					};
				}>;
			} | null;
		}
	>;
};
