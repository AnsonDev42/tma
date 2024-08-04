export function AIRecommendationChatBubble({
	recommendation,
}: { recommendation: string }) {
	return (
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
	);
}
