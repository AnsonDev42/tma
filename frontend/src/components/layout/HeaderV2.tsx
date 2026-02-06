import LanguageToggle from "@/components/features/MenuV2/LanguageToggle";
import OrderPanelToggle from "@/components/ui/OrderPanelToggle";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";

interface HeaderV2Props {
	title?: string;
	isOrderPanelOpen: boolean;
	onOrderPanelToggle: () => void;
}

const HeaderV2: React.FC<HeaderV2Props> = ({
	title = "TMA",
	isOrderPanelOpen,
	onOrderPanelToggle,
}) => {
	const { toggleTheme, isDark } = useTheme();

	return (
		<header
			className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur ${
				isDark
					? "border-slate-800 bg-slate-950/90"
					: "border-slate-300 bg-slate-100/92"
			}`}
		>
			<div className="container mx-auto flex items-center justify-between px-4 py-3">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-600">
						Menu Lens
					</p>
					<h1
						className={`text-xl font-semibold leading-tight ${
							isDark ? "text-slate-100" : "text-slate-800"
						}`}
					>
						{title}
					</h1>
				</div>

				<div className="flex items-center gap-2 sm:gap-3">
					<LanguageToggle />
					<button
						type="button"
						onClick={toggleTheme}
						className={`rounded-full p-2 ${
							isDark
								? "bg-slate-800 text-amber-300 hover:bg-slate-700"
								: "bg-slate-100 text-slate-700 hover:bg-slate-200"
						}`}
						aria-label="Toggle theme"
					>
						{isDark ? (
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
									d="M12 3v1m0 16v1m8-9h1M3 12h1m13.657 6.657l.707.707M5.636 5.636l.707.707m11.314 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						) : (
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
									d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1012 21a9 9 0 008.354-5.646z"
								/>
							</svg>
						)}
					</button>
					<OrderPanelToggle
						isOpen={isOrderPanelOpen}
						onClick={onOrderPanelToggle}
					/>
				</div>
			</div>
		</header>
	);
};

export default HeaderV2;
