import DishCard from "@/components/features/MenuV2/DishCard";
import DishModal from "@/components/features/MenuV2/DishModal";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { DishProps } from "@/types/DishProps.tsx";
import React, { useCallback, useState } from "react";

interface DishCardGridProps {
	theme: string;
	isMobile?: boolean;
	className?: string;
}

const DishCardGrid: React.FC<DishCardGridProps> = ({
	theme,
	isMobile = false,
	className = "",
}) => {
	const {
		dishes,
		hoveredDish,
		selectedDish,
		setHoveredDish,
		setSelectedDish,
		addToOrder,
	} = useMenuV2();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedDishForModal, setSelectedDishForModal] =
		useState<DishProps | null>(null);

	const selectedDishRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) {
			return;
		}
		node.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
		});
	}, []);

	const openDishModal = (dish: DishProps) => {
		setSelectedDishForModal(dish);
		setIsModalOpen(true);
	};

	if (!dishes.length) {
		return (
			<div
				className={`flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border p-5 text-center ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-300"
						: "border-slate-300 bg-slate-50 text-slate-600"
				}`}
			>
				<p className="text-lg font-semibold">No dishes available</p>
				<p className="mt-1 text-sm">
					Upload a menu or load a demo to see dishes.
				</p>
			</div>
		);
	}

	return (
		<div
			className={`flex h-full min-h-0 flex-col rounded-2xl border p-4 ${
				theme === "dark"
					? "border-slate-700 bg-slate-900"
					: "border-slate-300 bg-slate-50"
			} ${className}`}
		>
			<div className="mb-3 flex items-center justify-between">
				<div>
					<h2
						className={`text-xl font-semibold ${
							theme === "dark" ? "text-white" : "text-slate-700"
						}`}
					>
						Dishes
					</h2>
					<p
						className={`text-xs ${
							theme === "dark" ? "text-slate-400" : "text-slate-500"
						}`}
					>
						Tap a dish to view details and cross-check menu location.
					</p>
				</div>
				<div
					className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
						theme === "dark"
							? "bg-slate-800 text-slate-300"
							: "bg-slate-100 text-slate-600"
					}`}
				>
					{dishes.length} items
				</div>
			</div>

			<div
				className={`flex-1 overflow-y-auto pr-1 ${
					isMobile
						? "max-h-[min(72vh,calc(100vh-14rem))]"
						: "max-h-[calc(100vh-17rem)]"
				}`}
			>
				<div className="grid grid-cols-1 gap-3">
					{dishes.map((dish) => (
						<DishCard
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
								openDishModal(dish);
							}}
							theme={theme}
						/>
					))}
				</div>
			</div>

			<DishModal
				dish={selectedDishForModal}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onAddToOrder={addToOrder}
				theme={theme}
			/>
		</div>
	);
};

export default DishCardGrid;
