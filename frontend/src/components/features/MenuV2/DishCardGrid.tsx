import { useMenuV2 } from "@/contexts/MenuV2Context";
import { DishProps } from "@/types/DishProps.tsx";
import { truncateText } from "@/utils/truncateText";
import React, { useEffect, useRef } from "react";

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
	theme: string;
}

const DishCard = React.forwardRef<HTMLDivElement, DishCardProps>(
	({ dish, isHovered, isSelected, onHover, onSelect, theme }, ref) => {
		// Determine if we have an image to display
		const hasImage = dish.info.imgSrc && dish.info.imgSrc.length > 0;

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
					{/* Thumbnail */}
					<div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden mr-3 bg-gray-200">
						{hasImage ? (
							<img
								src={dish.info.imgSrc[0]}
								alt={dish.info.text}
								className="w-full h-full object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).src =
										"https://placeholder.co/100?text=No+Image";
								}}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400"></div>
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
							onSelect();
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
