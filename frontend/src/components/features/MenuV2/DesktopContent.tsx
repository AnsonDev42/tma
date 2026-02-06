import ViewModeToggle from "@/components/features/MenuV2/ViewModeToggle";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import DishCardGrid from "./DishCardGrid";
import DishLocationQuickPreview from "./DishLocationQuickPreview";
import ImageViewer from "./ImageViewer";
import UploadFormV2 from "./UploadFormV2";

const DesktopContent: React.FC = () => {
	const { theme } = useTheme();
	const { viewMode, selectedImage } = useMenuV2();
	const isListFocus = viewMode === "list-focus";

	return (
		<main className="container mx-auto px-4 pb-6 pt-20">
			<div
				className={`${
					isListFocus
						? "flex h-[calc(100vh-7.25rem)] min-h-0 flex-col gap-3 overflow-hidden"
						: "space-y-4"
				}`}
			>
				<UploadFormV2
					theme={theme}
					compact={isListFocus && Boolean(selectedImage)}
				/>

				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
							Workspace mode
						</p>
						<p className="text-sm text-slate-500">
							Use list-focus to prioritize dish reading and reduce image
							distraction.
						</p>
					</div>
					<ViewModeToggle theme={theme} />
				</div>

				<div
					className={`grid gap-4 lg:grid-cols-12 ${
						isListFocus ? "min-h-0 flex-1" : ""
					}`}
				>
					<div
						className={`${
							isListFocus ? "lg:col-span-4" : "lg:col-span-7"
						} ${isListFocus ? "order-2 min-h-0 lg:order-1" : "order-1"}`}
					>
						<ImageViewer
							theme={theme}
							compact={isListFocus}
							className={`${selectedImage ? "" : "min-h-[24rem]"} ${
								isListFocus ? "h-full min-h-0" : ""
							}`}
						/>
					</div>
					<div
						className={`${
							isListFocus ? "lg:col-span-8" : "lg:col-span-5"
						} order-1 ${isListFocus ? "min-h-0 lg:order-2" : "lg:order-2"}`}
					>
						<DishCardGrid
							theme={theme}
							fillHeight={isListFocus}
							className={isListFocus ? "h-full min-h-0" : ""}
						/>
					</div>
				</div>
			</div>
			<DishLocationQuickPreview theme={theme} />
		</main>
	);
};

export default DesktopContent;
