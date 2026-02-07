import {
	DebugBenchmarkCaseReport,
	DebugBenchmarkRunListResponse,
	DebugBenchmarkSummary,
} from "@/features/debug/types";
import axios from "axios";

function authHeaders(jwt: string) {
	return {
		Authorization: `Bearer ${jwt}`,
	};
}

export async function fetchBenchmarkRuns(
	jwt: string,
): Promise<DebugBenchmarkRunListResponse> {
	const response = await axios.get(`${__API_URL__}/debug/benchmark/runs`, {
		headers: authHeaders(jwt),
	});
	return response.data as DebugBenchmarkRunListResponse;
}

export async function fetchBenchmarkSummary(
	jwt: string,
	runId: string,
): Promise<DebugBenchmarkSummary> {
	const response = await axios.get(
		`${__API_URL__}/debug/benchmark/runs/${runId}/summary`,
		{
			headers: authHeaders(jwt),
		},
	);
	return response.data as DebugBenchmarkSummary;
}

export async function fetchBenchmarkCaseReport(
	jwt: string,
	runId: string,
	caseId: string,
): Promise<DebugBenchmarkCaseReport> {
	const response = await axios.get(
		`${__API_URL__}/debug/benchmark/runs/${runId}/cases/${caseId}`,
		{
			headers: authHeaders(jwt),
		},
	);
	return response.data as DebugBenchmarkCaseReport;
}

export async function fetchBenchmarkCaseImageUrl(
	jwt: string,
	runId: string,
	caseId: string,
): Promise<string> {
	const response = await axios.get(
		`${__API_URL__}/debug/benchmark/runs/${runId}/cases/${caseId}/image`,
		{
			headers: authHeaders(jwt),
			responseType: "blob",
		},
	);
	return URL.createObjectURL(response.data as Blob);
}
