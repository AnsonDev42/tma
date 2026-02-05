import axios from "axios";

export interface AIRecommendationPayload {
	dishes: string[];
	additional_info: string;
	language: string;
}

export const getAIRecommendations = async (
	payload: AIRecommendationPayload,
	jwt: string,
): Promise<string> => {
	try {
		const response = await axios.post(
			`${__API_URL__}/menu/recommendations`,

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
