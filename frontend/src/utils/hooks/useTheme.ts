import { useEffect, useState } from "react";

export function useTheme(): [boolean, () => void] {
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [userPreference, setUserPreference] = useState<string | null>(null);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			if (!userPreference) {
				const newTheme = e.matches ? "dark" : "light";
				document.documentElement.setAttribute("data-theme", newTheme);
				setIsDarkMode(e.matches);
			}
		};

		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [userPreference]);

	const toggleTheme = () => {
		const newTheme = isDarkMode ? "light" : "dark";
		document.documentElement.setAttribute("data-theme", newTheme);
		localStorage.setItem("theme", newTheme);
		setIsDarkMode(!isDarkMode);
		setUserPreference(newTheme);
	};

	return [isDarkMode, toggleTheme];
}
