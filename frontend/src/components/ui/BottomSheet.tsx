import { useTheme } from "@/contexts/ThemeContext";
import React, { useRef, useEffect } from "react";

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
	const bottomSheetRef = useRef<HTMLDivElement>(null);

	// Add effect to prevent body scrolling when bottom sheet is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	// Add effect to animate the bottom sheet when it opens
	useEffect(() => {
		if (isOpen && bottomSheetRef.current) {
			// Force a reflow to ensure the animation works properly
			bottomSheetRef.current.style.transform = "translateY(100%)";
			setTimeout(() => {
				if (bottomSheetRef.current) {
					bottomSheetRef.current.style.transform = "translateY(0)";

					// Dispatch an event when the bottom sheet is fully open
					// This helps with timing for scrolling to dishes
					setTimeout(() => {
						console.log("BottomSheet is now fully open");
						const openEvent = new CustomEvent("bottomSheetOpened");
						window.dispatchEvent(openEvent);

						// Check if there's a pending scroll request in session storage
						const pendingDishId = sessionStorage.getItem("pendingScrollDishId");
						if (pendingDishId) {
							console.log(
								`Found pending scroll request for dish ${pendingDishId}`,
							);
							// Dispatch a scroll event for this dish
							const scrollEvent = new CustomEvent("scrollToDish", {
								detail: { dishId: parseInt(pendingDishId) },
							});
							window.dispatchEvent(scrollEvent);
							// Clear the pending request
							sessionStorage.removeItem("pendingScrollDishId");
						}
					}, 300); // Match the transition duration
				}
			}, 10);
		}
	}, [isOpen]);

	// Function to handle sliding down animation
	const slideDown = () => {
		if (bottomSheetRef.current) {
			// Apply slide down animation
			bottomSheetRef.current.style.transform = "translateY(100%)";

			// After animation completes, toggle the state
			setTimeout(() => {
				onToggle();
			}, 300); // Match the transition duration
		}
	};

	return (
		<div
			ref={bottomSheetRef}
			className={`fixed bottom-0 left-0 right-0 z-40 ${isDark ? "bg-slate-800" : "bg-white"} rounded-t-xl shadow-lg`}
			style={{
				height,
				transform: isOpen ? "translateY(0)" : "translateY(100%)",
				transition: "transform 300ms ease-in-out",
				willChange: "transform",
				display: isOpen ? "block" : "block", // Always keep in DOM for animation
			}}
			// No touch event handlers here - we're using the toggle button instead
		>
			{/* Header with hide button */}
			<div className="w-full flex justify-between items-center px-4 py-2 border-b border-gray-200">
				<div className="flex-1"></div>
				<div className="flex-1 flex justify-center">
					<div
						className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`}
					></div>
				</div>
				<div className="flex-1 flex justify-end">
					<button
						onClick={slideDown}
						className={`p-1 rounded-full ${isDark ? "text-gray-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`}
						aria-label="Hide bottom sheet"
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
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
				</div>
			</div>

			<div
				className="p-4 overflow-y-auto h-[calc(100%-48px)] overscroll-contain"
				id="bottom-sheet-content"
			>
				{children}
			</div>
		</div>
	);
};

export default BottomSheet;
