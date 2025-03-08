import { useTheme } from "@/contexts/ThemeContext";
import React, { useEffect, useState } from "react";

interface BottomSheetProps {
	isOpen: boolean;
	height: string;
	onToggle: () => void;
	children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
	isOpen,
	height,
	onToggle,
	children,
}) => {
	const { isDark } = useTheme();
	const [isCollapsed, setIsCollapsed] = useState(false);

	const handleToggle = () => {
		if (isOpen && !isCollapsed) {
			setIsCollapsed(true);
		} else if (isOpen && isCollapsed) {
			setIsCollapsed(false);
			onToggle();
		} else {
			onToggle();
			setIsCollapsed(false);
		}
	};

	// Add effect to prevent body scrolling when bottom sheet is open
	useEffect(() => {
		if (isOpen && !isCollapsed) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen, isCollapsed]);

	return (
		<div
			className={`fixed bottom-0 left-0 right-0 z-40 ${isDark ? "bg-slate-800" : "bg-white"} rounded-t-xl shadow-lg`}
			style={{
				height,
				transform: !isOpen
					? "translateY(100%)"
					: isCollapsed
						? "translateY(calc(100% - 48px))"
						: "translateY(0)",
				transition: "transform 300ms ease-in-out",
				willChange: "transform",
				display: "block",
			}}
		>
			<div className="w-full flex justify-between items-center px-4 py-2 border-b border-gray-200">
				<div className="flex-1"></div>
				<div className="flex-1 flex justify-center">
					<div
						className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`}
					></div>
				</div>
				<div className="flex-1 flex justify-end">
					<button
						onClick={handleToggle}
						className={`p-1 rounded-full ${isDark ? "text-gray-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`}
						aria-label="Toggle bottom sheet"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							{isCollapsed ? (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 15l7-7 7 7"
								/>
							) : (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							)}
						</svg>
					</button>
				</div>
			</div>

			<div
				className={`p-4 overflow-y-auto h-[calc(100%-48px)] overscroll-contain ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
				style={{ transition: "opacity 250ms ease-in-out" }}
				id="bottom-sheet-content"
			>
				{children}
			</div>
		</div>
	);
};

export default BottomSheet;
