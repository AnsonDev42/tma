import ViewModeToggle from "@/components/features/MenuV2/ViewModeToggle";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { useTheme } from "@/contexts/ThemeContext";
import React, { useEffect, useState } from "react";
import DishCardGrid from "./DishCardGrid";
import DishLocationQuickPreview from "./DishLocationQuickPreview";
import ImageViewer from "./ImageViewer";
import UploadFormV2 from "./UploadFormV2";

const MobileContent: React.FC = () => {
	const { theme } = useTheme();
	const { selectedImage, viewMode, setViewMode } = useMenuV2();
	const [isMapOpen, setIsMapOpen] = useState(false);
	const isListFocus = viewMode === "list-focus";
	const shouldLockViewport = Boolean(selectedImage && isListFocus);

	useEffect(() => {
		setViewMode("list-focus");
	}, [setViewMode]);

	return (
		<main
			className={
				shouldLockViewport
					? "flex h-[100dvh] min-h-0 flex-col overflow-hidden overscroll-none px-3 pb-3 pt-20"
					: "px-3 pb-6 pt-20"
			}
		>
			<UploadFormV2 theme={theme} compact={Boolean(selectedImage)} />

			{selectedImage ? (
				<div
					className={`mt-4 ${
						isListFocus
							? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
							: "space-y-3"
					}`}
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<ViewModeToggle theme={theme} className="flex-1" />
						<button
							type="button"
							onClick={() => setIsMapOpen(true)}
							className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
								theme === "dark"
									? "bg-slate-800 text-slate-200 hover:bg-slate-700"
									: "bg-slate-100 text-slate-700 hover:bg-slate-200"
							}`}
						>
							Open map
						</button>
					</div>

					{viewMode === "balanced" ? (
						<div className="space-y-3">
							<ImageViewer theme={theme} isMobile={true} compact={true} />
							<DishCardGrid
								theme={theme}
								isMobile={true}
								className="min-h-[55vh]"
							/>
						</div>
					) : (
						<DishCardGrid
							theme={theme}
							isMobile={true}
							fillHeight={true}
							className="h-full min-h-0"
						/>
					)}
				</div>
			) : (
				<div
					className={`mt-4 rounded-2xl border p-4 text-sm ${
						theme === "dark"
							? "border-slate-700 bg-slate-900 text-slate-300"
							: "border-slate-200 bg-white text-slate-600"
					}`}
				>
					Upload a menu image or run a demo to start reading dish cards.
				</div>
			)}

			{isMapOpen && selectedImage && (
				<div className="fixed inset-0 z-[90] bg-slate-950/65 p-2 backdrop-blur-sm">
					<div className="relative h-full rounded-2xl border border-slate-700 bg-slate-900 p-3">
						<button
							type="button"
							onClick={() => setIsMapOpen(false)}
							className="absolute right-3 top-3 z-10 rounded-full bg-slate-800 p-2 text-slate-200"
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
						<ImageViewer
							theme={theme}
							isMobile={true}
							fitContainer={true}
							className="h-full"
						/>
					</div>
				</div>
			)}
			<DishLocationQuickPreview theme={theme} isMobile={true} />
		</main>
	);
};

export default MobileContent;
