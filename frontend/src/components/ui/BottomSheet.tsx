import { useTheme } from "@/contexts/ThemeContext";
import React, { useEffect, useRef, useState } from "react";

interface BottomSheetProps {
	isOpen: boolean;
	height: string;
	onToggle: () => void;
	children: React.ReactNode;
	minHeight?: string;
	maxHeight?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
	isOpen,
	height,
	onToggle,
	children,
	minHeight = "30vh",
	maxHeight = "90vh",
}) => {
	const { isDark } = useTheme();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [currentHeight, setCurrentHeight] = useState(height);
	const [isDragging, setIsDragging] = useState(false);
	const startYRef = useRef(0);
	const startHeightRef = useRef("");

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

	// Reset height when component is opened
	useEffect(() => {
		if (isOpen) {
			setCurrentHeight(height);
		}
	}, [isOpen, height]);

	// Handle drag start
	const handleDragStart = (clientY: number) => {
		setIsDragging(true);
		startYRef.current = clientY;
		startHeightRef.current = currentHeight;
		document.body.style.userSelect = "none";
	};

	// Handle drag movement
	const handleDrag = (clientY: number) => {
		if (!isDragging) return;

		const deltaY = startYRef.current - clientY;
		const startHeightPx = parseFloat(
			startHeightRef.current.replace(/[^\d.]/g, ""),
		);

		// Calculate new height based on drag direction
		const newHeightValue = startHeightPx + (deltaY / window.innerHeight) * 100;

		// Convert to vh for consistency
		const newHeight = `${newHeightValue}vh`;

		// Enforce min and max height constraints
		const minHeightValue = parseFloat(minHeight.replace(/[^\d.]/g, ""));
		const maxHeightValue = parseFloat(maxHeight.replace(/[^\d.]/g, ""));

		if (newHeightValue < minHeightValue) {
			setCurrentHeight(minHeight);
		} else if (newHeightValue > maxHeightValue) {
			setCurrentHeight(maxHeight);
		} else {
			setCurrentHeight(newHeight);
		}
	};

	// Handle drag end
	const handleDragEnd = () => {
		setIsDragging(false);
		document.body.style.userSelect = "";
	};

	// Setup event listeners for mouse and touch events
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => handleDrag(e.clientY);
		const handleTouchMove = (e: TouchEvent) => handleDrag(e.touches[0].clientY);

		const handleMouseUp = () => handleDragEnd();
		const handleTouchEnd = () => handleDragEnd();

		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("touchmove", handleTouchMove);
			window.addEventListener("mouseup", handleMouseUp);
			window.addEventListener("touchend", handleTouchEnd);
		}

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("touchmove", handleTouchMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("touchend", handleTouchEnd);
		};
	}, [isDragging, minHeight, maxHeight]);

	return (
		<div
			className={`fixed bottom-0 left-0 right-0 z-40 ${isDark ? "bg-slate-800" : "bg-white"} rounded-t-xl shadow-lg`}
			style={{
				height: currentHeight,
				transform: !isOpen
					? "translateY(100%)"
					: isCollapsed
						? "translateY(calc(100% - 48px))"
						: "translateY(0)",
				transition: isDragging ? "none" : "transform 300ms ease-in-out",
				willChange: "transform, height",
				display: "block",
			}}
		>
			<div
				className={`w-full flex justify-between items-center px-4 py-2 border-b border-gray-200 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
				onMouseDown={(e) => handleDragStart(e.clientY)}
				onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
			>
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
