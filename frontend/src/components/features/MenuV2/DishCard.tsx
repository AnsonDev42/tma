import DishLocationPopover from "@/components/features/MenuV2/DishLocationPopover";
import { DishProps } from "@/types/DishProps.tsx";
import { truncateText } from "@/utils/truncateText";
import React, { useState } from "react";

interface DishCardProps {
	dish: DishProps;
	isHovered: boolean;
	isSelected: boolean;
	onHover: (id: number | null) => void;
	onSelect: () => void;
	onAddToOrder: () => void;
	onClick: () => void;
	theme: string;
}

const DishCard = React.forwardRef<HTMLDivElement, DishCardProps>(
	(
		{
			dish,
			isHovered,
			isSelected,
			onHover,
			onSelect,
			onAddToOrder,
			onClick,
			theme,
		},
		ref,
	) => {
		const hasImage = dish.info.imgSrc && dish.info.imgSrc.length > 0;
		const hasMultipleImages = hasImage && dish.info.imgSrc.length > 1;
		const [currentImageIndex, setCurrentImageIndex] = useState(0);
		const [imageLoadError, setImageLoadError] = useState(false);

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

		const showImage = hasImage && !imageLoadError;

		return (
			<div
				ref={ref}
				role="button"
				tabIndex={0}
				data-testid={`dish-card-${dish.id}`}
				data-selected={isSelected ? "true" : "false"}
				onMouseEnter={() => onHover(dish.id)}
				onMouseLeave={() => onHover(null)}
				onClick={(event) => {
					event.stopPropagation();
					onSelect();
					onClick();
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onSelect();
						onClick();
					}
				}}
				className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
					theme === "dark"
						? "border-slate-700 bg-slate-800"
						: "border-slate-200 bg-white"
				} ${isHovered || isSelected ? "-translate-y-0.5 shadow-lg" : "shadow-sm"} ${
					isSelected
						? theme === "dark"
							? "ring-2 ring-teal-300"
							: "ring-2 ring-teal-500"
						: ""
				}`}
			>
				<div className="flex gap-3 p-3">
					<div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-200">
						{showImage ? (
							<img
								src={dish.info.imgSrc[currentImageIndex]}
								alt={dish.info.text || "Dish image"}
								className="h-full w-full object-cover"
								onError={() => setImageLoadError(true)}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center px-1 text-center text-xs text-slate-500">
								No image
							</div>
						)}

						{hasMultipleImages && !imageLoadError && (
							<div className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-1">
								{dish.info.imgSrc.map((_, index) => (
									<div
										key={index}
										className={`h-1.5 w-1.5 rounded-full ${
											index === currentImageIndex ? "bg-white" : "bg-white/50"
										}`}
									/>
								))}
							</div>
						)}

						{hasMultipleImages && !imageLoadError && (
							<>
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										navigateToPreviousImage();
									}}
									className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1 text-white"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										className="h-3.5 w-3.5"
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
									onClick={(event) => {
										event.stopPropagation();
										navigateToNextImage();
									}}
									className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1 text-white"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										className="h-3.5 w-3.5"
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

					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<h3
								className={`text-sm font-semibold sm:text-base ${
									theme === "dark" ? "text-white" : "text-slate-900"
								}`}
							>
								{dish.info.textTranslation ||
									dish.info.text ||
									`Dish ${dish.id + 1}`}
							</h3>
							<span
								className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
									theme === "dark"
										? "bg-slate-700 text-slate-300"
										: "bg-slate-100 text-slate-600"
								}`}
							>
								#{dish.id + 1}
							</span>
						</div>

						{dish.info.textTranslation &&
							dish.info.text &&
							dish.info.textTranslation !== dish.info.text && (
								<p
									className={`mt-1 text-xs italic ${
										theme === "dark" ? "text-slate-400" : "text-slate-500"
									}`}
								>
									{truncateText(dish.info.text, 56)}
								</p>
							)}

						<p
							className={`mt-2 text-xs leading-relaxed sm:text-sm ${
								theme === "dark" ? "text-slate-300" : "text-slate-600"
							}`}
						>
							{truncateText(
								dish.info.description || "No description available",
								110,
							)}
						</p>
					</div>
				</div>

				<div
					className={`flex items-center justify-between gap-2 border-t px-3 py-2 ${
						theme === "dark" ? "border-slate-700" : "border-slate-100"
					}`}
				>
					<DishLocationPopover dish={dish} theme={theme} />
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							onAddToOrder();
						}}
						className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
							theme === "dark"
								? "bg-teal-300 text-slate-900 hover:bg-teal-200"
								: "bg-teal-600 text-white hover:bg-teal-500"
						}`}
					>
						Add
					</button>
				</div>
			</div>
		);
	},
);

export default DishCard;
