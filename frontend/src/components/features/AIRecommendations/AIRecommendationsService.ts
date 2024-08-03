import axios from "axios";

export interface AIRecommendationPayload {
	dishes: string[];
	mode: string;
	additional_info: string;
	language: string;
}

export const getAIRecommendations = async (
	payload: AIRecommendationPayload,
	jwt: string,
): Promise<string> => {
	try {
		const response = await axios.post(
			"https://api.itsya0wen.com/ai-suggestions",
			// "http://localhost:8000/ai-suggestions",
			payload,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: jwt,
				},
			},
		);
		return response.data.suggestions as string;
	} catch (error) {
		throw new Error(
			`Failed to get AI recommendations: ${
				(error as Error).message || "Unknown error"
			}`,
		);
	}
};
