import { useBottomSheetContext } from "@/contexts/BottomSheetContext";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { BoundingBoxProps, DishProps } from "@/types/DishProps.tsx";
import React from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

interface ImageViewerProps {
	theme: string;
	isMobile?: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
	theme,
	isMobile = false,
}) => {
	const {
		selectedImage,
		dishes,
		hoveredDish,
		selectedDish,
		setHoveredDish,
		setSelectedDish,
	} = useMenuV2();

	// Get bottom sheet context to control it when dishes are clicked
	const { openBottomSheet, scrollToDish } = useBottomSheetContext();

	// Handle dish hover
	const handleMouseEnter = (dishId: number) => {
		setHoveredDish(dishId);
	};

	const handleMouseLeave = () => {
		setHoveredDish(null);
	};

	// Handle dish click
	const handleDishClick = (dish: DishProps) => {
		// Store the dish ID in session storage for reliable scrolling
		// This will be picked up by the BottomSheet when it's fully open
		sessionStorage.setItem("pendingScrollDishId", dish.id.toString());

		console.log(`Stored dish ${dish.id} in session storage for scrolling`);

		// Set the selected dish immediately
		setSelectedDish(dish.id);

		// First open the bottom sheet to ensure it's visible
		// The BottomSheet component will handle scrolling when it's fully open
		openBottomSheet();

		// Also try the direct approach as a fallback
		setTimeout(() => {
			scrollToDish(dish.id);
		}, 800); // Longer delay as a fallback
	};

	if (!selectedImage) {
		return (
			<div
				className={`flex flex-col items-center justify-center h-96 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-24 w-24 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p className="text-xl font-medium">No menu uploaded yet</p>
				<p className="mt-2">Upload a menu image to get started</p>
			</div>
		);
	}

	return (
		<div className={`flex flex-col ${isMobile ? "h-full" : ""}`}>
			<h2
				className={`text-xl font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
			>
				Menu Image
			</h2>

			<div
				className={`relative ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"} rounded-lg p-2 overflow-hidden ${isMobile ? "h-full" : ""}`}
			>
				<TransformWrapper
					key={selectedImage.timestamp || String(selectedImage.imageSrc)}
					initialScale={1}
					minScale={0.5}
					maxScale={4}
					wheel={{ step: 0.1 }}
					doubleClick={{ mode: "reset" }}
				>
					{({ zoomIn, zoomOut, resetTransform }) => (
						<>
							<div className="flex justify-end mb-2 space-x-2">
								<button
									onClick={() => zoomIn()}
									className={`p-2 rounded-md ${theme === "dark" ? "bg-slate-600 text-white" : "bg-white text-slate-700"} shadow`}
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
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
										/>
									</svg>
								</button>
								<button
									onClick={() => zoomOut()}
									className={`p-2 rounded-md ${theme === "dark" ? "bg-slate-600 text-white" : "bg-white text-slate-700"} shadow`}
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
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
										/>
									</svg>
								</button>
								<button
									onClick={() => resetTransform()}
									className={`p-2 rounded-md ${theme === "dark" ? "bg-slate-600 text-white" : "bg-white text-slate-700"} shadow`}
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
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
								</button>
							</div>

							<TransformComponent>
								<div className="relative inline-block align-top">
									<img
										src={selectedImage.imageSrc as string}
										alt="Menu"
										className="block max-w-full h-auto rounded"
									/>

									<div className="absolute inset-0">
										{dishes.map((dish) => (
											<div
												key={dish.id}
												data-testid={`menu-overlay-${dish.id}`}
												data-selected={
													selectedDish === dish.id ? "true" : "false"
												}
												data-hovered={
													hoveredDish === dish.id ? "true" : "false"
												}
												className={`absolute cursor-pointer transition-all duration-200 ${
													hoveredDish === dish.id || selectedDish === dish.id
														? "z-10 ring-2 ring-blue-500"
														: ""
												}`}
												style={getOverlayStyle(
													dish.boundingBox,
													hoveredDish === dish.id,
													selectedDish === dish.id,
													theme,
												)}
												onMouseEnter={() => handleMouseEnter(dish.id)}
												onMouseLeave={handleMouseLeave}
												onClick={() => handleDishClick(dish)}
											>
												{(hoveredDish === dish.id ||
													selectedDish === dish.id) && (
													<div
														className={`absolute -top-10 left-0 ${theme === "dark" ? "bg-slate-700" : "bg-white"} p-2 rounded shadow-lg text-sm whitespace-nowrap z-20`}
													>
														{dish.info.textTranslation || dish.info.text}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							</TransformComponent>
						</>
					)}
				</TransformWrapper>
			</div>

			{!isMobile && (
				<div className="mt-4 text-sm text-center text-gray-500">
					<p>
						Hover over highlighted areas to see dish details. Click to add to
						order.
					</p>
				</div>
			)}
		</div>
	);
};

// Helper function to calculate the overlay style for bounding boxes
function getOverlayStyle(
	boundingBox: BoundingBoxProps,
	isHovered: boolean,
	isSelected: boolean,
	theme: string,
) {
	const safeX = clamp01(boundingBox.x);
	const safeY = clamp01(boundingBox.y);
	const safeW = clamp01(boundingBox.w);
	const safeH = clamp01(boundingBox.h);

	// Ensure box stays within image bounds even if backend returns slightly >1 values.
	const boundedW = Math.min(safeW, 1 - safeX);
	const boundedH = Math.min(safeH, 1 - safeY);
	const opacity = isHovered ? 0.6 : isSelected ? 0.5 : 0.3;
	const bgColor =
		isHovered || isSelected
			? theme === "dark"
				? "rgba(59, 130, 246, " + opacity + ")"
				: "rgba(59, 130, 246, " + opacity + ")"
			: theme === "dark"
				? "rgba(255, 255, 255, 0.2)"
				: "rgba(0, 0, 0, 0.1)";

	return {
		width: `${boundedW * 100}%`,
		height: `${boundedH * 100}%`,
		left: `${safeX * 100}%`,
		top: `${safeY * 100}%`,
		background: bgColor,
		border:
			isHovered || isSelected
				? "2px solid rgb(59, 130, 246)"
				: theme === "dark"
					? "1px solid rgba(255, 255, 255, 0.3)"
					: "1px solid rgba(0, 0, 0, 0.2)",
		boxShadow:
			isHovered || isSelected
				? theme === "dark"
					? "0 0 10px rgba(59, 130, 246, 0.5)"
					: "0 0 10px rgba(59, 130, 246, 0.3)"
				: "none",
	};
}

function clamp01(value: number) {
	return Math.max(0, Math.min(1, value));
}

export default ImageViewer;
