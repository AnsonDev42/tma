import { useTheme } from "@/contexts/ThemeContext";
import React from "react";

interface MobileUploadButtonProps {
	onClick: () => void;
}

const MobileUploadButton: React.FC<MobileUploadButtonProps> = ({ onClick }) => {
	const { isDark } = useTheme();

	return (
		<button
			onClick={onClick}
			className={`fixed bottom-[130px] right-4 z-40 p-3 rounded-full shadow-lg
              ${isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}
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
					d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
				/>
			</svg>
		</button>
	);
};

export default MobileUploadButton;
