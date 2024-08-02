import React from "react";
import { useAIRecommendations } from "./useAIRecommendations";

interface AIRecommendationButtonProps {
	dishes: string[];
	onRecommendation: (recommendation: string) => void;
}

export const AIRecommendationButton: React.FC<AIRecommendationButtonProps> = ({
	dishes,
	onRecommendation,
}) => {
	const { askAIRecommendation, isLoading, error } = useAIRecommendations();

	const handleClick = async () => {
		const recommendation = await askAIRecommendation(
			dishes,
			"I am not sure what to eat, but not beef today.",
		);
		if (recommendation) {
			onRecommendation(recommendation);
		}
	};

	return (
		<>
			<button
				className="btn btn-primary"
				onClick={handleClick}
				disabled={isLoading}
			>
				{isLoading ? "Curating a menu for you..." : "Not sure what to eat?"}
			</button>
			{error && <div className="text-error mt-2">{error}</div>}
		</>
	);
};
