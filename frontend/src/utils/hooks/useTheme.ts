import { useEffect, useState } from "react";

export function useTheme(): [boolean, () => void] {
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		const savedTheme = localStorage.getItem("theme") || "light";
		document.documentElement.setAttribute("data-theme", savedTheme);
		setIsDarkMode(savedTheme === "dark");
	}, []);

	const toggleTheme = () => {
		const newTheme = isDarkMode ? "light" : "dark";
		document.documentElement.setAttribute("data-theme", newTheme);
		localStorage.setItem("theme", newTheme);
		setIsDarkMode(!isDarkMode);
	};

	return [isDarkMode, toggleTheme];
}
