import DishCard from "@/components/features/MenuV2/DishCard";
import DishModal from "@/components/features/MenuV2/DishModal";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { DishProps } from "@/types/DishProps.tsx";
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

	// State for the modal
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedDishForModal, setSelectedDishForModal] =
		useState<DishProps | null>(null);

	// When the selected dish changes, scroll it into view
	useEffect(() => {
		if (selectedDishRef.current) {
			selectedDishRef.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [selectedDish]);

	// Function to handle opening the modal with the selected dish
	const handleOpenModal = (dish: DishProps) => {
		setSelectedDishForModal(dish);
		setIsModalOpen(true);
	};

	// Function to handle closing the modal
	const handleCloseModal = () => {
		setIsModalOpen(false);
	};

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
							onClick={() => {
								handleOpenModal(dish);
							}}
							theme={theme}
						/>
					))}
				</div>
			</div>

			{/* Dish Modal */}
			<DishModal
				dish={selectedDishForModal}
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				onAddToOrder={addToOrder}
				theme={theme}
			/>
		</div>
	);
};

export default DishCardGrid;
