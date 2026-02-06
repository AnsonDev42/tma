import { useMenuV2 } from "@/contexts/MenuV2Context";
import { DishProps } from "@/types/DishProps.tsx";
import React from "react";

interface DishLocationPopoverProps {
	dish: DishProps;
	theme: string;
}

const DishLocationPopover: React.FC<DishLocationPopoverProps> = ({
	dish,
	theme,
}) => {
	const {
		selectedImage,
		locationPreviewDishId,
		setLocationPreviewDishId,
		setSelectedDish,
	} = useMenuV2();
	const hasMenuImage = Boolean(selectedImage?.imageSrc);
	const isPreviewOpen = locationPreviewDishId === dish.id;

	return (
		<button
			type="button"
			disabled={!hasMenuImage}
			data-testid={`dish-location-trigger-${dish.id}`}
			onClick={(event) => {
				event.stopPropagation();
				if (isPreviewOpen) {
					setLocationPreviewDishId(null);
					return;
				}
				setSelectedDish(dish.id);
				setLocationPreviewDishId(dish.id);
			}}
			aria-pressed={isPreviewOpen}
			className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
				hasMenuImage
					? theme === "dark"
						? "bg-slate-700 text-slate-200 hover:bg-slate-600"
						: "bg-slate-100 text-slate-700 hover:bg-slate-200"
					: "cursor-not-allowed bg-slate-200 text-slate-400"
			}`}
		>
			Locate
		</button>
	);
};

export default DishLocationPopover;
