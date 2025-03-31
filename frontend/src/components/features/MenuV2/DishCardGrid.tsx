import { useMenuV2 } from "@/contexts/MenuV2Context";
import { DishProps } from "@/types/DishProps.tsx";
import { truncateText } from "@/utils/truncateText";
import React, { useEffect, useRef, useState } from "react";

interface DishCardGridProps {
	theme: string;
	isMobile?: boolean;
}

const DishCardGrid: React.FC<DishCardGridProps> = ({
	theme,
	isMobile = false,
}) => {
	const {
		dishes,
		hoveredDish,
		selectedDish,
		setHoveredDish,
		setSelectedDish,
		addToOrder,
	} = useMenuV2();

	// Create a ref to hold the currently selected dish card
	const selectedDishRef = useRef<HTMLDivElement>(null);

	// When the selected dish changes, scroll it into view
	useEffect(() => {
		if (selectedDishRef.current) {
			selectedDishRef.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [selectedDish]);

	if (!dishes.length) {
		return (
			<div
				className={`flex flex-col items-center justify-center h-96 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
			>
				<p className="text-xl font-medium">No dishes available</p>
				<p className="mt-2">Upload a menu to see dishes</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex justify-between items-center mb-4">
				<h2
					className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}
				>
					Dishes
				</h2>
				<div className="text-sm text-gray-500">{dishes.length} items</div>
			</div>

			<div
				className="overflow-y-auto pr-2 custom-scrollbar"
				style={{
					maxHeight: isMobile ? "calc(100% - 40px)" : "calc(100vh - 300px)",
				}}
			>
				<div className="grid grid-cols-1 gap-4">
					{dishes.map((dish) => (
						<DishCard
							// Only attach the ref if this dish is selected
							ref={selectedDish === dish.id ? selectedDishRef : null}
							key={dish.id}
							dish={dish}
							isHovered={hoveredDish === dish.id}
							isSelected={selectedDish === dish.id}
							onHover={setHoveredDish}
							onSelect={() => {
								setSelectedDish(dish.id);
							}}
							onAddToOrder={() => {
								addToOrder(dish);
							}}
							theme={theme}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

interface DishCardProps {
	dish: DishProps;
	isHovered: boolean;
	isSelected: boolean;
	onHover: (id: number | null) => void;
	onSelect: () => void;
	onAddToOrder: () => void;
	theme: string;
}

const DishCard = React.forwardRef<HTMLDivElement, DishCardProps>(
	(
		{ dish, isHovered, isSelected, onHover, onSelect, onAddToOrder, theme },
		ref,
	) => {
		// Determine if we have an image to display
		const hasImage = dish.info.imgSrc && dish.info.imgSrc.length > 0;
		const hasMultipleImages = hasImage && dish.info.imgSrc.length > 1;

		// State to track current image index
		const [currentImageIndex, setCurrentImageIndex] = useState(0);

		// Track image loading errors
		const [imageLoadError, setImageLoadError] = useState<boolean>(false);

		// Touch handling for swipe
		const [touchStart, setTouchStart] = useState<number | null>(null);
		const [touchEnd, setTouchEnd] = useState<number | null>(null);

		// Minimum swipe distance (in px)
		const minSwipeDistance = 50;

		// Reset image load error when image index changes
		useEffect(() => {
			setImageLoadError(false);
		}, [currentImageIndex]);

		const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
			setTouchStart(e.targetTouches[0].clientX);
			setTouchEnd(null);
		};

		const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
			setTouchEnd(e.targetTouches[0].clientX);
		};

		const handleTouchEnd = () => {
			if (!touchStart || !touchEnd) return;

			const distance = touchStart - touchEnd;
			const isLeftSwipe = distance > minSwipeDistance;
			const isRightSwipe = distance < -minSwipeDistance;

			if (isLeftSwipe && hasMultipleImages) {
				// Next image
				setCurrentImageIndex((prevIndex) =>
					prevIndex === dish.info.imgSrc.length - 1 ? 0 : prevIndex + 1,
				);
			}

			if (isRightSwipe && hasMultipleImages) {
				// Previous image
				setCurrentImageIndex((prevIndex) =>
					prevIndex === 0 ? dish.info.imgSrc.length - 1 : prevIndex - 1,
				);
			}

			// Reset
			setTouchStart(null);
			setTouchEnd(null);
		};

		// Function to navigate to next/previous image
		const navigateImage = (direction: "next" | "prev") => {
			if (direction === "next") {
				setCurrentImageIndex((prevIndex) =>
					prevIndex === dish.info.imgSrc.length - 1 ? 0 : prevIndex + 1,
				);
			} else {
				setCurrentImageIndex((prevIndex) =>
					prevIndex === 0 ? dish.info.imgSrc.length - 1 : prevIndex - 1,
				);
			}
		};

		// Handle image load error
		const handleImageError = () => {
			setImageLoadError(true);
		};

		// Get current image source or placeholder if error
		const getCurrentImageSrc = () => {
			if (imageLoadError || !hasImage) {
				return "https://placehold.co/100x100?text=Swip-to-see-image";
			}
			return dish.info.imgSrc[currentImageIndex];
		};

		return (
			<div
				ref={ref}
				className={`
					relative rounded-xl overflow-hidden transition-all duration-200
					${
						theme === "dark"
							? isHovered || isSelected
								? "bg-slate-700 shadow-lg"
								: "bg-slate-700 shadow"
							: isHovered || isSelected
								? "bg-white shadow-lg"
								: "bg-white shadow"
					}
					${isHovered || isSelected ? "transform scale-102" : ""}
					${isSelected ? "ring-2 ring-blue-500" : ""}
				`}
				onMouseEnter={() => onHover(dish.id)}
				onMouseLeave={() => onHover(null)}
				onClick={onSelect}
			>
				<div className="flex p-3">
					{/* Thumbnail with Carousel */}
					<div
						className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden mr-3 bg-gray-200 relative"
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
					>
						{hasImage || imageLoadError ? (
							<>
								<img
									src={getCurrentImageSrc()}
									alt={dish.info.text || "Dish image"}
									className="w-full h-full object-cover transition-opacity duration-300"
									onError={handleImageError}
								/>

								{/* Navigation arrows - only show when hovered or selected and has multiple images */}
								{hasMultipleImages &&
									!imageLoadError &&
									(isHovered || isSelected) && (
										<>
											<button
												className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-1 rounded-r-md"
												onClick={(e) => {
													e.stopPropagation();
													navigateImage("prev");
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M15 19l-7-7 7-7"
													/>
												</svg>
											</button>
											<button
												className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-1 rounded-l-md"
												onClick={(e) => {
													e.stopPropagation();
													navigateImage("next");
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</button>
										</>
									)}

								{/* Dots indicator for multiple images */}
								{hasMultipleImages && !imageLoadError && (
									<div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1">
										{dish.info.imgSrc.map((_, index) => (
											<div
												key={index}
												className={`h-1.5 w-1.5 rounded-full ${
													index === currentImageIndex
														? "bg-white"
														: "bg-white bg-opacity-50"
												}`}
											/>
										))}
									</div>
								)}
							</>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
								<span className="text-xs text-center px-1">No Image</span>
							</div>
						)}
					</div>

					{/* Content */}
					<div className="flex-1">
						<h3
							className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-800"}`}
						>
							{dish.info.textTranslation || dish.info.text}
						</h3>

						{dish.info.textTranslation &&
							dish.info.text &&
							dish.info.textTranslation !== dish.info.text && (
								<p
									className={`text-sm italic mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
								>
									{truncateText(dish.info.text, 50)}
								</p>
							)}

						<p
							className={`text-sm mt-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
						>
							{truncateText(
								dish.info.description || "No description available",
								80,
							)}
						</p>
					</div>
				</div>

				{/* Add to Order Button */}
				<div
					className={`flex justify-end p-2 border-t ${theme === "dark" ? "border-slate-600" : "border-gray-100"}`}
				>
					<button
						className={`
							px-3 py-1 rounded-md text-sm font-medium transition-colors
							${theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}
						`}
						onClick={(e) => {
							e.stopPropagation();
							onAddToOrder();
						}}
					>
						Add to Order
					</button>
				</div>
			</div>
		);
	},
);

export default DishCardGrid;
