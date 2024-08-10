import { DishImageCard } from "@/components/features/Dish/DishImageCard";
import { ShowTextState } from "@/components/features/Menu/Menu";
import { DishProps } from "@/types/DishProps";
import { truncateText } from "@/utils/truncateText";
import React, { useEffect } from "react";
interface GlobalDishCardProps {
	dish: DishProps;
	timeStamp: string;
	showTextState: number;
	isCartView: number;
	setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const GlobalDishCard: React.FC<GlobalDishCardProps> = ({
	dish,
	timeStamp,
	showTextState,
	isCartView,
	setOpenModal,
}) => {
	const [isModalOpen, setIsModalOpen] = React.useState(false);

	useEffect(() => {
		setOpenModal(isModalOpen);
	}, [isModalOpen]);

	const getTranslation = () => {
		if (showTextState === ShowTextState.HIDE_ALL) {
			return truncateText(dish?.info?.textTranslation || "", 50);
		}
		return dish?.info?.textTranslation || "";
	};

	const getOriginalText = () => {
		if (showTextState === ShowTextState.HIDE_ALL) {
			return truncateText(dish?.info?.text || "", 100);
		}
		return showTextState === ShowTextState.SHOW_BOTH ? dish?.info?.text : "";
	};

	return (
		<>
			<div onClick={() => setIsModalOpen(true)} className="cursor-pointer">
				{isCartView ? (
					<>
						<h1 className="text-xl font-semibold accent-content">
							{getTranslation()}
						</h1>
						{getOriginalText() && (
							<p className="text-base-content italic">{getOriginalText()}</p>
						)}
					</>
				) : (
					<>
						{showTextState === ShowTextState.SHOW_ONLY_TRANSLATION
							? getTranslation()
							: `${getTranslation()}/${getOriginalText()}`}
					</>
				)}
			</div>
			{isModalOpen && (
				<DishImageCard
					dish={dish}
					openModalIndex={0}
					setOpenModalIndex={() => setIsModalOpen(false)}
					index={0}
					timeStamp={timeStamp}
				/>
			)}
		</>
	);
};
