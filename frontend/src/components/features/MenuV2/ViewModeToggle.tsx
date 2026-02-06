import { MenuViewMode, useMenuV2 } from "@/contexts/MenuV2Context";
import React from "react";

interface ViewModeToggleProps {
	theme: string;
	className?: string;
	modes?: MenuViewMode[];
}

const modeLabel: Record<MenuViewMode, { title: string; subtitle: string }> = {
	balanced: {
		title: "Balanced",
		subtitle: "Image + list",
	},
	"list-focus": {
		title: "List Focus",
		subtitle: "Minimal image",
	},
};

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
	theme,
	className = "",
	modes = ["balanced", "list-focus"],
}) => {
	const { viewMode, setViewMode } = useMenuV2();

	return (
		<div
			className={`inline-flex items-center gap-1 rounded-xl border p-1 ${
				theme === "dark"
					? "border-slate-700 bg-slate-800"
					: "border-slate-200 bg-white"
			} ${className}`}
		>
			{modes.map((mode) => {
				const isActive = mode === viewMode;

				return (
					<button
						type="button"
						key={mode}
						onClick={() => setViewMode(mode)}
						aria-pressed={isActive}
						className={`rounded-lg px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
							isActive
								? theme === "dark"
									? "bg-teal-300 text-slate-900"
									: "bg-teal-600 text-white"
								: theme === "dark"
									? "text-slate-300 hover:bg-slate-700"
									: "text-slate-600 hover:bg-slate-100"
						}`}
					>
						<div className="font-semibold leading-tight">
							{modeLabel[mode].title}
						</div>
						<div className="text-[11px] opacity-80">
							{modeLabel[mode].subtitle}
						</div>
					</button>
				);
			})}
		</div>
	);
};

export default ViewModeToggle;
