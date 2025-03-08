import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import DishCardGrid from "./DishCardGrid";
import ImageViewer from "./ImageViewer";
import UploadFormV2 from "./UploadFormV2";

const DesktopContent: React.FC = () => {
	const { theme, isDark } = useTheme();

	return (
		<main className="container mx-auto pt-20 pb-10 px-4">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Upload Form */}
				<div
					className={`lg:col-span-3 ${
						isDark ? "bg-slate-800 shadow-lg" : "bg-white shadow-xl"
					} rounded-xl p-6 mb-6`}
				>
					<UploadFormV2 theme={theme} />
				</div>

				{/* Image Viewer */}
				<div
					className={`lg:col-span-2 ${
						isDark ? "bg-slate-800 shadow-lg" : "bg-white shadow-xl"
					} rounded-xl p-6`}
				>
					<ImageViewer theme={theme} />
				</div>
				{/* Dish Grid */}
				<div
					className={`${
						isDark ? "bg-slate-800 shadow-lg" : "bg-white shadow-xl"
					} rounded-xl p-6`}
				>
					<DishCardGrid theme={theme} />
				</div>
			</div>
		</main>
	);
};

export default DesktopContent;
