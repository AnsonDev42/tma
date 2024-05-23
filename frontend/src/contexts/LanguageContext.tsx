// LanguageContext.tsx
import React, { useContext, ReactNode } from "react";

export type Language = {
	value: string;
	label: string;
};

const LanguageContext = React.createContext<{
	selectedLanguage: Language | null;
	setSelectedLanguage: (language: Language | null) => void;
}>({
	selectedLanguage: null,
	setSelectedLanguage: (_language: Language | null) => {
		null;
	},
});
export const useLanguageContext = () => {
	const context = useContext(LanguageContext);
	if (context === null) {
		throw new Error(
			"useLanguageContext must be used within a LanguageProvider",
		);
	}
	return context;
};

type LanguageProviderProps = {
	children: ReactNode;
	initialLanguage: Language;
};

export const languages: Language[] = [
	{ value: "zh-cn", label: "简体中文" },
	{ value: "zh-tw", label: "繁體中文" },
	{ value: "en-us", label: "English" },
	{ value: "ja", label: "日本語" },
	{ value: "ko", label: "한국어" },
	{ value: "fr", label: "Français" },
	{ value: "de", label: "Deutsch" },
	{ value: "es", label: "Español" },
];

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
	children,
	initialLanguage,
}) => {
	const [selectedLanguage, setSelectedLanguage] =
		React.useState<Language | null>(initialLanguage);

	return (
		<LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
};
