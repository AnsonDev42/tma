import { MoonIcon } from "@/components/ui/Icons/MoonIcon.tsx";
import { SunIcon } from "@/components/ui/Icons/SunIcon.tsx";
import { useTheme } from "@/utils/hooks/useTheme";
import React from "react";

export function ThemeToggle(): React.JSX.Element {
	const [isDarkMode, toggleTheme] = useTheme();

	return (
		<label className="swap swap-rotate">
			{/* this hidden checkbox controls the state */}
			<input
				type="checkbox"
				className="theme-controller"
				checked={isDarkMode}
				onChange={toggleTheme}
			/>

			{/* sun icon */}
			<SunIcon />

			{/* moon icon */}
			<MoonIcon />
		</label>
	);
}
