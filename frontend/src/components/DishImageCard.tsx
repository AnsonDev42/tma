import { SearchButtons } from "@/components/DishSearchButtons.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import React, { useEffect, useRef } from "react";
export function DishImageCard({
	dish,
	openModalIndex,
	setOpenModalIndex,
	index,
}: {
	dish: DishProps;
	openModalIndex: number | null;
	setOpenModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
	index: number;
}): React.ReactElement {
	const modalRef = useRef<HTMLDialogElement>(null);

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
								<h2 className="card-title">{dish.info.text}</h2>
								<p className="text-gray-700 mb-4">{dish.info.description}</p>
								<SearchButtons dishname={dish.info.text} />
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
