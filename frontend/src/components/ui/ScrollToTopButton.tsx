import { useTheme } from "@/contexts/ThemeContext";
import React from "react";

interface ScrollToTopButtonProps {
	visible: boolean;
	onClick: () => void;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
	visible,
	onClick,
}) => {
	const { isDark } = useTheme();

	if (!visible) return null;

	return (
		<button
			onClick={onClick}
			className={`fixed bottom-20 right-4 p-3 rounded-full shadow-lg z-50 transition-all duration-300 ${
				isDark ? "bg-slate-700 text-white" : "bg-white text-slate-800"
			}`}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M5 10l7-7m0 0l7 7m-7-7v18"
				/>
			</svg>
		</button>
	);
};

export default ScrollToTopButton;
