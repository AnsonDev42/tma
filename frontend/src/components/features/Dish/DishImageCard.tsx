import { SearchButtons } from "@/components/features/Dish/DishSearchButtons.tsx";
import { DishImageCardProps } from "@/types/DishImageCardType.ts";
import { DishProps } from "@/types/DishProps";
import { useCartState } from "@/utils/hooks/useCartState.ts";
import { useModal } from "@/utils/hooks/useModal.ts";
import React from "react";

export function DishImageCard({
	dish,
	openModalIndex,
	setOpenModalIndex,
	index,
	timeStamp,
}: DishImageCardProps) {
	const modalRef = useModal(openModalIndex, index, setOpenModalIndex);
	const [isChecked, handleCheckboxChange] = useCartState(
		dish.id,
		timeStamp,
		"My Cart",
	);

	if (!dish.info.text || openModalIndex !== index) return null;

	return (
		<dialog ref={modalRef} id={`modal_${index}`} className="modal">
			<div className="modal-box m-3 overflow-hidden max-h-[80vh] max-w-[90vw] overflow-y-scroll">
				<div className="card bg-base-100 shadow-xl h-full flex flex-col">
					<DishImages imageSrcs={dish.info.imgSrc} />
					<DishContent
						dish={dish}
						isChecked={isChecked}
						handleCheckboxChange={handleCheckboxChange}
					/>
					<CloseButton setOpenModalIndex={setOpenModalIndex} />
				</div>
			</div>
			<form
				method="dialog"
				className="modal-backdrop"
				onClick={() => setOpenModalIndex(null)}
			>
				<button>Close</button>
			</form>
		</dialog>
	);
}

function DishImages({ imageSrcs }: { imageSrcs: DishProps["info"]["imgSrc"] }) {
	if (!imageSrcs) return null;
	return (
		<div className="carousel carousel-center max-h-65 p-2 space-x-4 bg-neutral rounded-box">
			{imageSrcs.map((src: string, imgIndex: number) => (
				<div className="carousel-item" key={src}>
					<img
						loading="lazy"
						src={src}
						className="rounded-box max-h-[260px] object-contain"
						alt={`Dish image ${imgIndex + 1}`}
					/>
				</div>
			))}
		</div>
	);
}

function DishContent({
	dish,
	isChecked,
	handleCheckboxChange,
}: {
	dish: DishProps;
	isChecked: boolean;
	handleCheckboxChange: (checked: boolean) => void;
}) {
	return (
		<div className="card-body flex-1 overflow-y-auto">
			<div className="card-title  text-base-content text-2xl font-bold text-wrap">
				{dish.info.textTranslation}
			</div>
			<div className="text-gray-500 mb-2 italic text-xl text-wrap">
				{dish.info.text}
			</div>
			<div className="form-control">
				<label className="cursor-pointer label">
					<span className="label-text">Add to Cart</span>
					<input
						type="checkbox"
						className="checkbox checkbox-secondary"
						checked={isChecked}
						onChange={(e) => handleCheckboxChange(e.target.checked)}
					/>
				</label>
			</div>
			<div className="text-base-content text-base text-wrap ">
				{dish.info.description}
			</div>
			<SearchButtons dishName={dish.info.text} />
		</div>
	);
}

function CloseButton({
	setOpenModalIndex,
}: { setOpenModalIndex: React.Dispatch<React.SetStateAction<number | null>> }) {
	return (
		<form method="dialog" onClick={() => setOpenModalIndex(null)}>
			<div className="card-actions justify-end">
				<button className="btn btn-primary m-3">Close</button>
			</div>
		</form>
	);
}

export default DishImageCard;
