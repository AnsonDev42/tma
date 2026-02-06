import DishLocationPopover from "@/components/features/MenuV2/DishLocationPopover";
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

	React.useEffect(() => {
		if (!isOpen) {
			return;
		}
		setCurrentImageIndex(0);
		setImageLoadError(false);
	}, [isOpen]);

	React.useEffect(() => {
		if (!isOpen) {
			return;
		}

		document.body.style.overflow = "hidden";
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleEscape);

		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose]);

	if (!dish || !isOpen) {
		return null;
	}

	const hasImage = dish.info.imgSrc && dish.info.imgSrc.length > 0;
	const hasMultipleImages = hasImage && dish.info.imgSrc.length > 1;
	const canRenderImage = hasImage && !imageLoadError;

	const navigateToPreviousImage = () => {
		setImageLoadError(false);
		setCurrentImageIndex((prev) =>
			prev === 0 ? dish.info.imgSrc.length - 1 : prev - 1,
		);
	};

	const navigateToNextImage = () => {
		setImageLoadError(false);
		setCurrentImageIndex((prev) =>
			prev === dish.info.imgSrc.length - 1 ? 0 : prev + 1,
		);
	};

	const imageSrc = canRenderImage
		? dish.info.imgSrc[currentImageIndex]
		: "https://placehold.co/640x360?text=No+Dish+Image";

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
			data-testid="dish-modal"
		>
			<div
				className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div
				className={`relative z-[1001] w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-100"
						: "border-slate-200 bg-white text-slate-900"
				}`}
			>
				<button
					type="button"
					onClick={onClose}
					data-testid="dish-modal-close"
					className={`absolute right-3 top-3 rounded-full p-1 ${
						theme === "dark"
							? "bg-slate-800 text-slate-200"
							: "bg-slate-100 text-slate-600"
					}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						className="h-5 w-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div className="grid gap-5 p-5 md:grid-cols-[1.2fr_1fr]">
					<div className="space-y-3">
						<div className="relative overflow-hidden rounded-xl bg-slate-200">
							<img
								src={imageSrc}
								alt={dish.info.text || "Dish image"}
								className="h-64 w-full object-cover md:h-72"
								onError={() => setImageLoadError(true)}
							/>

							{hasMultipleImages && !imageLoadError && (
								<>
									<button
										type="button"
										onClick={navigateToPreviousImage}
										className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											className="h-4 w-4"
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
										type="button"
										onClick={navigateToNextImage}
										className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											className="h-4 w-4"
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
						</div>

						{hasMultipleImages && !imageLoadError && (
							<div className="flex justify-center gap-1">
								{dish.info.imgSrc.map((_, index) => (
									<div
										key={index}
										className={`h-1.5 w-1.5 rounded-full ${
											index === currentImageIndex
												? "bg-teal-400"
												: theme === "dark"
													? "bg-slate-600"
													: "bg-slate-300"
										}`}
									/>
								))}
							</div>
						)}
					</div>

					<div className="space-y-4">
						<div>
							<p
								className={`text-xs font-semibold uppercase tracking-[0.18em] ${
									theme === "dark" ? "text-teal-300" : "text-teal-700"
								}`}
							>
								Dish Detail
							</p>
							<h3 className="mt-1 text-2xl font-semibold">
								{dish.info.textTranslation || dish.info.text}
							</h3>
							{dish.info.textTranslation &&
								dish.info.text &&
								dish.info.textTranslation !== dish.info.text && (
									<p className="mt-1 text-sm italic text-slate-500">
										{dish.info.text}
									</p>
								)}
						</div>

						<div>
							<p className="text-sm leading-relaxed text-slate-500">
								{dish.info.description || "No description available"}
							</p>
						</div>

						<div className="flex items-center gap-2">
							<DishLocationPopover dish={dish} theme={theme} />
							<button
								type="button"
								onClick={() => {
									onAddToOrder(dish);
									onClose();
								}}
								className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
									theme === "dark"
										? "bg-teal-300 text-slate-900 hover:bg-teal-200"
										: "bg-teal-600 text-white hover:bg-teal-500"
								}`}
							>
								Add to order
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return ReactDOM.createPortal(modalContent, document.body);
};

export default DishModal;
