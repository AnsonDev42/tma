import { Language } from "@/contexts/LanguageContext.tsx";
import { MenuAnalyzeResponse } from "@/features/menu/types";
import { normalizeAnalyzeResults } from "@/features/menu/utils/menuResults";
import { DishProps } from "@/types/DishProps.tsx";
import axios from "axios";

function readAnalyzeResults(payload: unknown) {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (payload && typeof payload === "object") {
		const typedPayload = payload as MenuAnalyzeResponse;
		if (Array.isArray(typedPayload.results)) {
			return typedPayload.results;
		}
	}

	return [];
}

export async function uploadMenuData(
	formData: FormData,
	jwt: string,
	selectedLanguage: Language | null,
): Promise<DishProps[]> {
	try {
		const response = await axios.post(`${__API_URL__}/menu/analyze`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
				Authorization: jwt,
				"Accept-Language": selectedLanguage?.value || "en",
			},
		});

		return normalizeAnalyzeResults(readAnalyzeResults(response.data));
	} catch (error) {
		throw new Error(
			`Failed to send: ${(error as Error).message || "Unknown error"}`,
		);
	}
}

export async function loadDemoMenuData(
	demoDataUrl: string,
): Promise<DishProps[]> {
	const response = await fetch(demoDataUrl);

	if (!response.ok) {
		throw new Error(
			`Failed to load demo menu data (${response.status} ${response.statusText})`,
		);
	}

	const payload = await response.json();
	return normalizeAnalyzeResults(readAnalyzeResults(payload));
}
