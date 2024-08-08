import { AIRecommendationChatBubble } from "@/components/features/AIRecommendations/AIRecommendationChatBubble.tsx";
import { HelperDropDownIcon } from "@/components/ui/Icons/HelperDropDownIcon.tsx";
import { useUserInfo } from "@/contexts/UserInfoContext.tsx";
import React, { useEffect, useState } from "react";
import { useAIRecommendations } from "./useAIRecommendations";

interface AIRecommendationButtonProps {
	dishes: string[];
}

export const AIRecommendationButton: React.FC<AIRecommendationButtonProps> = ({
	dishes,
}) => {
	const { askAIRecommendation, isLoading, error } = useAIRecommendations();
	const [recommendation, setRecommendation] = useState<string | null>(null);
	const [numberOfPeople, setNumberOfPeople] = useState<string>("1");
	const [additionalInfo, setAdditionalInfo] = useState<string>("");
	const { userInfo } = useUserInfo();
	const [remainingAccesses, setRemainingAccesses] = useState<number>(
		userInfo?.remaining_accesses || 0,
	);
	useEffect(() => {
		if (userInfo) {
			setRemainingAccesses(userInfo.remaining_accesses);
		}
	}, [userInfo]);
	const handleClick = async () => {
		setRecommendation(null);
		const result = await askAIRecommendation(
			dishes,
			`Recommend for ${numberOfPeople} people. Additional info: ${additionalInfo}`,
		);
		if (result) {
			setRecommendation(result);
			setRemainingAccesses(remainingAccesses - 1);
		}
	};

	return (
		<div className="flex flex-col items-start gap-4 w-full max-w-md">
			<div className="flex flex-row items-start gap-4 w-full max-w-md">
				<div className="flex items-center gap-4">
					<h1>
						You are on {userInfo && userInfo.role} plan ( remaining asks{" "}
						{remainingAccesses}/{userInfo?.daily_limit} )
					</h1>
					<button
						className="btn btn-primary"
						onClick={handleClick}
						disabled={isLoading || remainingAccesses <= 0}
					>
						Get AI Recommendation
					</button>
					{isLoading && (
						<span className="loading loading-dots loading-lg"></span>
					)}
				</div>
				<div className="dropdown dropdown-end">
					<div
						tabIndex={0}
						role="button"
						className="btn btn-circle btn-ghost btn-xs text-info"
					>
						<HelperDropDownIcon />
					</div>
					<div
						tabIndex={0}
						className="card compact dropdown-content bg-base-100 rounded-box z-[1] w-64 shadow"
					>
						<div tabIndex={0} className="card-body">
							<h2 className="card-title">Customize Recommendation</h2>
							<select
								className="select select-warning w-full"
								value={numberOfPeople}
								onChange={(e) => setNumberOfPeople(e.target.value)}
							>
								<option disabled>Select number of people</option>
								{[1, 2, 3, 4, 5].map((num) => (
									<option key={num} value={num.toString()}>
										{num} {num === 1 ? "person" : "people"}
									</option>
								))}
							</select>
							<label className="form-control w-full">
								<div className="label bg-info-content">
									<span className="label-text">Additional Requirements</span>
								</div>
								<textarea
									className="textarea textarea-bordered h-24 w-full"
									placeholder="E.g., dietary restrictions, preferences"
									value={additionalInfo}
									onChange={(e) => setAdditionalInfo(e.target.value)}
								></textarea>
							</label>
						</div>
					</div>
				</div>
			</div>

			{error && <div className="text-error mt-2">{error}</div>}
			{recommendation && AIRecommendationChatBubble({ recommendation })}
		</div>
	);
};
