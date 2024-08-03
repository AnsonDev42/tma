import React, { useState } from "react";
import { useAIRecommendations } from "./useAIRecommendations";

interface AIRecommendationButtonProps {
	dishes: string[];
	onRecommendation: (recommendation: string) => void;
}

export const AIRecommendationButton: React.FC<AIRecommendationButtonProps> = ({
	dishes,
}) => {
	const { askAIRecommendation, isLoading, error } = useAIRecommendations();
	const [recommendation, setRecommendation] = useState<string | null>(null);

	const handleClick = async () => {
		const result = await askAIRecommendation(
			dishes,
			"I am not sure what to eat, but not beef today.",
		);
		if (result) {
			setRecommendation(result);
		}
	};

	return (
		<div className="flex flex-col items-start gap-4">
			<div className="flex items-center gap-4">
				<button
					className="btn btn-primary"
					onClick={handleClick}
					disabled={isLoading}
				>
					Not sure what to eat?
				</button>
				{isLoading && <span className="loading loading-dots loading-lg"></span>}
			</div>
			{error && <div className="text-error mt-2 mb-4">{error}</div>}
			{recommendation && (
				<div className="chat chat-start">
					<div className="chat-image avatar">
						<div className="w-10 rounded-full">
							<img
								alt="Tailwind CSS chat bubble component"
								src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
							/>
						</div>
					</div>
					<div className="chat-bubble"> {recommendation}</div>
				</div>
			)}
		</div>
	);
};
