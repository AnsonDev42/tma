import { SearchButtons } from "@/components/features/Dish/DishSearchButtons.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import {
	CartItem,
	addDishToCart,
	getCartByName,
	removeDishFromCart,
} from "@/utils/localStorageUtils.ts";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
export function DishImageCard({
	dish,
	openModalIndex,
	setOpenModalIndex,
	index,
	timeStamp,
}: {
	dish: DishProps;
	openModalIndex: number | null;
	setOpenModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
	index: number;
	timeStamp: string;
}): React.ReactElement {
	const modalRef = useRef<HTMLDialogElement>(null);
	const cartName = "My Cart"; // Define a cart name (could be dynamic)
	const [isChecked, setIsChecked] = useState(false);
	// hacky way to get the latest image timestamp from local storage to save to cart

	useEffect(() => {
		const cart = getCartByName(cartName);
		if (cart) {
			const isInCart = cart.items.some(
				(item: CartItem) =>
					item.dishId === dish.id && item.uploadTimestamp === timeStamp,
			);
			setIsChecked(isInCart);
		}
	}, [index, timeStamp]);

	const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const checked = event.target.checked;
		setIsChecked(checked);
		if (checked) {
			toast.success(
				`${dish.info.text} (${dish.info.textTranslation}) added to cart`,
			);
			addDishToCart(cartName, dish.id, timeStamp);
		} else {
			removeDishFromCart(cartName, dish.id, timeStamp);
		}
	};

	// fix safari modal positioning
	useEffect(() => {
		if (openModalIndex === index && modalRef.current) {
			const modal = modalRef.current;
			if (typeof modal.showModal === "function") {
				modal.showModal();
			}
			modal.addEventListener("close", () => setOpenModalIndex(null));

			// Trigger a reflow to ensure the modal is centered
			modal.style.display = "none";
			modal.offsetHeight; // Trigger a reflow
			modal.style.display = "";
		}
	}, [openModalIndex, index, setOpenModalIndex]);

	return (
		<>
			{dish.info.text && openModalIndex === index && (
				<dialog ref={modalRef} id={`modal_${index}`} className="modal">
					<div className="modal-box m-3 overflow-hidden max-h-[80vh] max-w-[90vw] overflow-y-scroll">
						{/*the card */}
						<div className="card bg-base-100 shadow-xl h-full flex flex-col ">
							{/*top images*/}
							{/*<figure className="skeleton w-4/5 h-64 items-center justify-center self-center overflow-y-hidden">*/}
							{/*	Search image coming soon... (CORS AND legal issues)*/}
							{/*</figure>*/}

							{dish.info.imgSrc && openModalIndex === index && (
								<>
									{dish.info.imgSrc && (
										<div className="carousel carousel-center max-h-65 p-2 space-x-4 bg-neutral rounded-box">
											{dish.info.imgSrc.map((src: string, imgIndex: number) => (
												<div className="carousel-item" key={src}>
													<img
														loading={"lazy"}
														src={src}
														className="rounded-box max-h-[260px] object-contain"
														alt={`${dish.info.text} -img ${imgIndex}`}
													/>
												</div>
											))}
										</div>
									)}
								</>
							)}
							<div className="card-body flex-1 overflow-y-auto">
								<h2 className="card-title text-2xl font-bold ">
									{dish.info.textTranslation}
								</h2>
								<p className="text-gray-500 mb-2 italic">{dish.info.text}</p>
								<div className="form-control">
									<label className="cursor-pointer label">
										<span className="label-text">Add to Cart</span>
										<input
											type="checkbox"
											className="checkbox checkbox-secondary"
											checked={isChecked}
											onChange={handleCheckboxChange}
										/>
									</label>
								</div>
								<p className="text-gray-700 mb-4">{dish.info.description}</p>
								<SearchButtons dishName={dish.info.text} />
							</div>
							<form method="dialog" onClick={() => setOpenModalIndex(null)}>
								{/* if there is a button in form, it will close the modal */}
								<div className="card-actions justify-end">
									<button className="btn btn-primary m-3">Close</button>
								</div>
							</form>
						</div>
					</div>
					<form
						method="dialog"
						className="modal-backdrop"
						onClick={() => {
							setOpenModalIndex(null);
						}}
					>
						<button>Close</button>
					</form>
				</dialog>
			)}
		</>
	);
}

export default DishImageCard;
