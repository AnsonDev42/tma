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
			type="button"
			onClick={onClick}
			className={`relative rounded-full p-2 ${
				isDark
					? "bg-slate-800 text-teal-300 hover:bg-slate-700"
					: "bg-slate-100 text-teal-700 hover:bg-slate-200"
			}`}
			aria-expanded={isOpen}
			aria-label={isOpen ? "Close order panel" : "Open order panel"}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.2 2.2a1 1 0 00.7 1.7H17m0 0a2 2 0 110 4 2 2 0 010-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			{isOpen && (
				<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
			)}
		</button>
	);
};

export default OrderPanelToggle;
