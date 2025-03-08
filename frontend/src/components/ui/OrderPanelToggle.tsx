import { useTheme } from "@/contexts/ThemeContext";
import React from "react";

interface OrderPanelToggleProps {
	isOpen: boolean;
	onClick: () => void;
}

const OrderPanelToggle: React.FC<OrderPanelToggleProps> = ({
	isOpen,
	onClick,
}) => {
	const { isDark } = useTheme();

	return (
		<button
			onClick={onClick}
			className={`p-2 rounded-full relative ${
				isDark
					? "bg-slate-700 text-blue-400 shadow-inner"
					: "bg-slate-300 text-blue-600 shadow"
			}`}
			aria-expanded={isOpen}
			aria-label={isOpen ? "Close order panel" : "Open order panel"}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			{isOpen && (
				<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
			)}
		</button>
	);
};

export default OrderPanelToggle;
