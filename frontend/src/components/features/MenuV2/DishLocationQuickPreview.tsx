import { useMenuV2 } from "@/contexts/MenuV2Context";
import { BoundingBoxProps } from "@/types/DishProps.tsx";
import React, { useEffect } from "react";

interface DishLocationQuickPreviewProps {
	theme: string;
	isMobile?: boolean;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function getOverlayStyle(box: BoundingBoxProps): React.CSSProperties {
	const safeX = clamp01(box.x);
	const safeY = clamp01(box.y);
	const safeW = Math.min(clamp01(box.w), 1 - safeX);
	const safeH = Math.min(clamp01(box.h), 1 - safeY);

	return {
		left: `${safeX * 100}%`,
		top: `${safeY * 100}%`,
		width: `${safeW * 100}%`,
		height: `${safeH * 100}%`,
	};
}

const DishLocationQuickPreview: React.FC<DishLocationQuickPreviewProps> = ({
	theme,
	isMobile = false,
}) => {
	const {
		selectedImage,
		dishes,
		locationPreviewDishId,
		setLocationPreviewDishId,
	} = useMenuV2();

	const highlightedDish = dishes.find(
		(dish) => dish.id === locationPreviewDishId,
	);

	useEffect(() => {
		if (!highlightedDish) {
			return;
		}

		const timer = window.setTimeout(() => {
			setLocationPreviewDishId(null);
		}, 6000);

		return () => {
			window.clearTimeout(timer);
		};
	}, [highlightedDish, setLocationPreviewDishId]);

	if (!selectedImage || !highlightedDish) {
		return null;
	}

	return (
		<div
			className={`fixed z-[85] ${
				isMobile ? "bottom-3 left-3 right-3" : "bottom-5 right-5"
			}`}
		>
			<div
				className={`overflow-hidden rounded-2xl border shadow-2xl ${
					isMobile ? "w-full" : "w-[20rem]"
				} ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-100"
						: "border-slate-200 bg-white text-slate-900"
				}`}
			>
				<div className="flex items-center justify-between px-3 py-2">
					<div>
						<p
							className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
								theme === "dark" ? "text-teal-300" : "text-teal-700"
							}`}
						>
							Menu locate
						</p>
						<p className="text-xs font-medium">
							{highlightedDish.info.textTranslation ||
								highlightedDish.info.text ||
								`Dish ${highlightedDish.id + 1}`}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setLocationPreviewDishId(null)}
						className={`rounded-full p-1 ${
							theme === "dark"
								? "bg-slate-800 text-slate-200 hover:bg-slate-700"
								: "bg-slate-100 text-slate-600 hover:bg-slate-200"
						}`}
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="border-t border-slate-200/40 p-2 dark:border-slate-700/60">
					<div className="flex justify-center rounded-xl bg-slate-950/5 p-1 dark:bg-black/20">
						<div
							className="relative inline-block"
							data-testid="dish-location-map-wrapper"
						>
							<img
								src={selectedImage.imageSrc as string}
								alt="Dish location map"
								className="block max-h-48 w-auto max-w-full rounded-lg object-contain"
							/>
							<div className="absolute inset-0">
								<div
									data-testid={`dish-location-map-${highlightedDish.id}`}
									className="absolute border-2 border-teal-300 bg-teal-300/30 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]"
									style={getOverlayStyle(highlightedDish.boundingBox)}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DishLocationQuickPreview;
