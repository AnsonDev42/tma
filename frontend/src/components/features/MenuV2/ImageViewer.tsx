import { useMenuV2 } from "@/contexts/MenuV2Context";
import { BoundingBoxProps, DishProps } from "@/types/DishProps.tsx";
import React from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

interface ImageViewerProps {
	theme: string;
	isMobile?: boolean;
	compact?: boolean;
	fitContainer?: boolean;
	className?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
	theme,
	isMobile = false,
	compact = false,
	fitContainer = false,
	className = "",
}) => {
	const {
		selectedImage,
		dishes,
		hoveredDish,
		selectedDish,
		setHoveredDish,
		setSelectedDish,
	} = useMenuV2();

	const handleDishClick = (dish: DishProps) => {
		setSelectedDish(dish.id);
	};

	if (!selectedImage) {
		return (
			<div
				className={`flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border p-6 text-center ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-400"
						: "border-slate-200 bg-white text-slate-500"
				} ${className}`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					className="mb-3 h-14 w-14"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.2}
						d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2.2-2.2l1.4-1.4a2 2 0 012.8 0L20 14M14 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p className="text-lg font-semibold">No menu image loaded</p>
				<p className="mt-1 text-sm">
					Upload a menu to enable location overlays.
				</p>
			</div>
		);
	}

	return (
		<div
			className={`flex h-full min-h-0 flex-col rounded-2xl border p-3 ${
				theme === "dark"
					? "border-slate-700 bg-slate-900"
					: "border-slate-200 bg-white"
			} ${className}`}
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div>
					<h2
						className={`text-base font-semibold sm:text-lg ${
							theme === "dark" ? "text-white" : "text-slate-900"
						}`}
					>
						Menu Map
					</h2>
					<p
						className={`text-xs ${
							theme === "dark" ? "text-slate-400" : "text-slate-500"
						}`}
					>
						Tap highlights to sync with dish cards.
					</p>
				</div>
				{compact && (
					<span
						className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
							theme === "dark"
								? "bg-slate-800 text-slate-300"
								: "bg-slate-100 text-slate-600"
						}`}
					>
						Compact
					</span>
				)}
			</div>

			<div
				className={`relative flex-1 overflow-hidden rounded-xl ${
					theme === "dark" ? "bg-slate-800" : "bg-slate-100"
				} ${compact ? "max-h-[34vh]" : "max-h-[calc(100vh-16rem)]"}`}
			>
				<TransformWrapper
					key={selectedImage.timestamp || String(selectedImage.imageSrc)}
					initialScale={1}
					minScale={0.65}
					maxScale={4}
					wheel={{ step: 0.12 }}
					doubleClick={{ mode: "reset" }}
				>
					{({ zoomIn, zoomOut, resetTransform }) => (
						<>
							<div className="absolute right-2 top-2 z-20 flex items-center gap-1">
								<button
									type="button"
									onClick={() => zoomIn()}
									className={`rounded-md p-1.5 shadow ${
										theme === "dark"
											? "bg-slate-700 text-slate-200"
											: "bg-white text-slate-600"
									}`}
								>
									+
								</button>
								<button
									type="button"
									onClick={() => zoomOut()}
									className={`rounded-md p-1.5 shadow ${
										theme === "dark"
											? "bg-slate-700 text-slate-200"
											: "bg-white text-slate-600"
									}`}
								>
									-
								</button>
								<button
									type="button"
									onClick={() => resetTransform()}
									className={`rounded-md p-1.5 text-xs shadow ${
										theme === "dark"
											? "bg-slate-700 text-slate-200"
											: "bg-white text-slate-600"
									}`}
								>
									Reset
								</button>
							</div>

							<TransformComponent
								wrapperClass="!w-full !h-full"
								contentClass="!w-full !h-full"
							>
								<div className="flex h-full w-full items-center justify-center">
									<div
										className="relative inline-block align-top"
										data-testid="menu-image-wrapper"
									>
										<img
											src={selectedImage.imageSrc as string}
											alt="Menu"
											className={`block rounded-md ${
												fitContainer
													? "max-h-[calc(100vh-10rem)] max-w-[calc(100vw-2rem)] object-contain"
													: isMobile
														? "max-h-[65vh]"
														: "max-h-[72vh]"
											}`}
											data-testid="menu-image"
										/>

										<div className="absolute inset-0">
											{dishes.map((dish) => (
												<div
													key={dish.id}
													data-testid={`menu-overlay-${dish.id}`}
													data-selected={
														selectedDish === dish.id ? "true" : "false"
													}
													data-hovered={
														hoveredDish === dish.id ? "true" : "false"
													}
													className={`absolute cursor-pointer transition-all duration-150 ${
														hoveredDish === dish.id || selectedDish === dish.id
															? "z-10"
															: ""
													}`}
													style={getOverlayStyle(
														dish.boundingBox,
														hoveredDish === dish.id,
														selectedDish === dish.id,
													)}
													onMouseEnter={() => setHoveredDish(dish.id)}
													onMouseLeave={() => setHoveredDish(null)}
													onClick={() => handleDishClick(dish)}
												>
													{(hoveredDish === dish.id ||
														selectedDish === dish.id) && (
														<div
															className={`absolute -top-9 left-0 rounded-md px-2 py-1 text-xs shadow-lg ${
																theme === "dark"
																	? "bg-slate-900 text-slate-100"
																	: "bg-white text-slate-700"
															}`}
														>
															{dish.info.textTranslation ||
																dish.info.text ||
																`Dish ${dish.id + 1}`}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								</div>
							</TransformComponent>
						</>
					)}
				</TransformWrapper>
			</div>
		</div>
	);
};

function clamp01(value: number) {
	return Math.max(0, Math.min(1, value));
}

function getOverlayStyle(
	boundingBox: BoundingBoxProps,
	isHovered: boolean,
	isSelected: boolean,
): React.CSSProperties {
	const safeX = clamp01(boundingBox.x);
	const safeY = clamp01(boundingBox.y);
	const safeW = Math.min(clamp01(boundingBox.w), 1 - safeX);
	const safeH = Math.min(clamp01(boundingBox.h), 1 - safeY);

	const opacity = isHovered ? 0.58 : isSelected ? 0.48 : 0.28;

	return {
		width: `${safeW * 100}%`,
		height: `${safeH * 100}%`,
		left: `${safeX * 100}%`,
		top: `${safeY * 100}%`,
		background: `rgba(45, 212, 191, ${opacity})`,
		border:
			isHovered || isSelected
				? "2px solid rgb(45, 212, 191)"
				: "1px solid rgba(15, 23, 42, 0.35)",
		boxShadow:
			isHovered || isSelected ? "0 0 0 1px rgba(15, 23, 42, 0.2)" : "none",
	};
}

export default ImageViewer;
