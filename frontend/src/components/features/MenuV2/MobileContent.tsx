import BottomSheet from "@/components/ui/BottomSheet";
import MobileUploadButton from "@/components/ui/MobileUploadButton";
import { useBottomSheetContext } from "@/contexts/BottomSheetContext";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import DishCardGrid from "./DishCardGrid";
import ImageViewer from "./ImageViewer";
import UploadFormV2 from "./UploadFormV2";

interface MobileContentProps {
	isUploadFormOpen: boolean;
	toggleUploadForm: () => void;
}

const MobileContent: React.FC<MobileContentProps> = ({
	isUploadFormOpen,
	toggleUploadForm,
}) => {
	const { theme, isDark } = useTheme();
	const { selectedImage } = useMenuV2();
	// Use the bottom sheet context instead of props
	const {
		isOpen: isBottomSheetOpen,
		height: bottomSheetHeight,
		toggleBottomSheet,
	} = useBottomSheetContext();

	return (
		<main className="pt-16 h-screen">
			{/* Full Screen Image Viewer */}
			<div className="h-full w-full">
				<ImageViewer theme={theme} isMobile={true} />
			</div>

			{/* Upload Form Overlay */}
			{isUploadFormOpen && (
				<div
					className={`fixed inset-0 z-40 ${isDark ? "bg-slate-900" : "bg-slate-100"} p-4 pt-20 overflow-y-auto`}
				>
					<button
						onClick={toggleUploadForm}
						className="absolute top-20 right-4 p-2 rounded-full bg-slate-300 text-slate-700"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
					<div className="mt-4">
						<UploadFormV2 theme={theme} />
					</div>
				</div>
			)}

			{/* Upload Button (Only shown when no image is selected) */}
			{!selectedImage && !isUploadFormOpen && (
				<div className="fixed inset-0 flex items-center justify-center z-30">
					<button
						onClick={toggleUploadForm}
						className={`px-6 py-3 rounded-lg font-medium text-lg shadow-lg
                  ${isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}
					>
						Upload Menu
					</button>
				</div>
			)}

			{/* Bottom Sheet for Dish Cards */}
			{selectedImage && (
				<BottomSheet
					isOpen={isBottomSheetOpen}
					height={bottomSheetHeight}
					onToggle={toggleBottomSheet}
				>
					<div className="animate-fade-in-up">
						<DishCardGrid theme={theme} isMobile={true} />
					</div>
				</BottomSheet>
			)}

			{/* Mobile Upload Button */}
			{selectedImage && !isUploadFormOpen && (
				<MobileUploadButton onClick={toggleUploadForm} />
			)}
		</main>
	);
};

export default MobileContent;
