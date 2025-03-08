import LanguageToggle from "@/components/features/MenuV2/LanguageToggle";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";

interface HeaderProps {
	title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "TMA" }) => {
	const { toggleTheme, isDark } = useTheme();

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 ${isDark ? "bg-slate-800" : "bg-slate-200"} shadow-lg`}
		>
			<div className="container mx-auto px-4 py-3 flex justify-between items-center">
				<div className="flex items-center">
					<h1
						className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}
					>
						{title} <span className="text-blue-500">v2</span>
					</h1>
				</div>

				<div className="flex items-center space-x-4">
					<LanguageToggle />

					{/* Theme Toggle */}
					<button
						onClick={toggleTheme}
						className={`p-2 rounded-full ${
							isDark
								? "bg-slate-700 text-yellow-300 shadow-inner"
								: "bg-slate-300 text-slate-700 shadow"
						}`}
					>
						{isDark ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>
		</header>
	);
};

export default Header;
