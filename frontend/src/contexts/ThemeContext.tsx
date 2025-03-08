import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";

type ThemeType = "light" | "dark";

interface ThemeContextType {
	theme: ThemeType;
	toggleTheme: () => void;
	isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};

interface ThemeProviderProps {
	children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const [theme, setTheme] = useState<ThemeType>("light");

	// Apply theme to body
	useEffect(() => {
		document.body.className =
			theme === "dark" ? "bg-slate-900" : "bg-slate-100";
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
	};

	const value = {
		theme,
		toggleTheme,
		isDark: theme === "dark",
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
};
