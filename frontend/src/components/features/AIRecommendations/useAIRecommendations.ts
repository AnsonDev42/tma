import { useLanguageContext } from "@/contexts/LanguageContext";
import { SessionContext } from "@/contexts/SessionContext";
import { useState } from "react";
import { useContext } from "react";
import { getAIRecommendations } from "./AIRecommendationsService";

export const useAIRecommendations = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { selectedLanguage } = useLanguageContext();
	const session = useContext(SessionContext)?.session;

	const askAIRecommendation = async (
		dishes: string[],
		additionalInfo: string,
	) => {
		if (!session || !session.access_token) {
			setError("Please refresh to login again. No session found.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const payload = {
				dishes,
				mode: "recommend for me",
				additional_info: additionalInfo,
				language: selectedLanguage?.label || "en",
			};

			const jwt = `Bearer ${session.access_token}`;
			const suggestion = await getAIRecommendations(payload, jwt);
			setIsLoading(false);
			return suggestion;
		} catch (error) {
			setError((error as Error).message || "Failed to get AI recommendations");
			setIsLoading(false);
		}
	};

	return { askAIRecommendation, isLoading, error };
};
