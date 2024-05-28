import { useEffect, useRef } from "react";

export const useModal = (
	openModalIndex: number | null,
	index: number,
	setOpenModalIndex: (index: number | null) => void,
) => {
	const modalRef = useRef<HTMLDialogElement>(null);

	// fix safari modal positioning
	useEffect(() => {
		if (openModalIndex === index && modalRef.current) {
			const modal = modalRef.current;
			if (typeof modal.showModal === "function") {
				modal.showModal();
			}
			modal.addEventListener("close", () => setOpenModalIndex(null));

			modal.style.display = "none";
			modal.offsetHeight; // Trigger a reflow
			modal.style.display = "";
		}
	}, [openModalIndex, index, setOpenModalIndex]);

	return modalRef;
};
