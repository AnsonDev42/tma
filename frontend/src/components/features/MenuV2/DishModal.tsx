import { DishProps } from "@/types/DishProps.tsx";
import React from "react";
import ReactDOM from "react-dom";

interface DishModalProps {
	dish: DishProps | null;
	isOpen: boolean;
	onClose: () => void;
	onAddToOrder: (dish: DishProps) => void;
	theme: string;
}

const DishModal: React.FC<DishModalProps> = ({
	dish,
	isOpen,
	onClose,
	onAddToOrder,
	theme,
}) => {
	const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
	const [imageLoadError, setImageLoadError] = React.useState(false);

	// Reset image load error when dish or image index changes
	React.useEffect(() => {
		setImageLoadError(false);
	}, [dish, currentImageIndex]);

	// Reset image index when dish changes
	React.useEffect(() => {
		setCurrentImageIndex(0);
	}, [dish]);

	// Prevent body scrolling when modal is open
	React.useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!dish || !isOpen) return null;

	const hasImage = dish.info.imgSrc && dish.info.imgSrc.length > 0;
	const hasMultipleImages = hasImage && dish.info.imgSrc.length > 1;

	// Function to navigate to next/previous image
	const navigateImage = (direction: "next" | "prev") => {
		if (!hasMultipleImages) return;

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
			return "https://placehold.co/400x300?text=No+Image+Available";
		}
		return dish.info.imgSrc[currentImageIndex];
	};

	// Create the modal content
	const modalContent = (
		<div
			className="fixed inset-0 flex items-center justify-center z-[1000]"
			data-testid="dish-modal"
		>
			<div
				className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
				onClick={onClose}
			></div>

			<div
				className={`modal-box relative max-w-3xl z-[1001] ${theme === "dark" ? "bg-slate-800" : "bg-white"}`}
			>
				<button
					className="btn btn-sm btn-circle absolute right-2 top-2"
					onClick={onClose}
					data-testid="dish-modal-close"
				>
					✕
				</button>

				<h3
					className={`font-bold text-lg ${theme === "dark" ? "text-white" : "text-slate-800"}`}
				>
					{dish.info.textTranslation || dish.info.text}
				</h3>

				{dish.info.textTranslation &&
					dish.info.text &&
					dish.info.textTranslation !== dish.info.text && (
						<p
							className={`text-sm italic mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
						>
							{dish.info.text}
						</p>
					)}

				<div className="py-4">
					{/* Image carousel */}
					<div className="relative w-full h-64 mb-4 bg-gray-200 rounded-lg overflow-hidden">
						{hasImage || imageLoadError ? (
							<>
								<img
									src={getCurrentImageSrc()}
									alt={dish.info.text || "Dish image"}
									className="w-full h-full object-contain transition-opacity duration-300"
									onError={handleImageError}
								/>

								{/* Navigation arrows - only show when has multiple images */}
								{hasMultipleImages && !imageLoadError && (
									<>
										<button
											className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full"
											onClick={() => navigateImage("prev")}
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
													d="M15 19l-7-7 7-7"
												/>
											</svg>
										</button>
										<button
											className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full"
											onClick={() => navigateImage("next")}
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
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
									</>
								)}

								{/* Dots indicator for multiple images */}
								{hasMultipleImages && !imageLoadError && (
									<div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
										{dish.info.imgSrc.map((_, index) => (
											<div
												key={index}
												className={`h-2 w-2 rounded-full ${
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
								<span className="text-center px-1">No Image Available</span>
							</div>
						)}
					</div>

					{/* Description */}
					<div
						className={`mt-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
					>
						<h4
							className={`font-medium mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
						>
							Description
						</h4>
						<p className="text-sm">
							{dish.info.description || "No description available"}
						</p>
					</div>
				</div>

				<div className="modal-action">
					<button
						className="btn btn-primary"
						onClick={() => {
							onAddToOrder(dish);
							onClose();
						}}
					>
						Add to Order
					</button>
					<button className="btn" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);

	// Use React Portal to render the modal at the root level of the DOM
	return ReactDOM.createPortal(modalContent, document.body);
};

export default DishModal;
