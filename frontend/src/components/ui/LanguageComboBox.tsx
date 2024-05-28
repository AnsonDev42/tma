import { languages, useLanguageContext } from "@/contexts/LanguageContext.tsx";
import React, { useEffect } from "react";

export function LanguageComboBox() {
	const { selectedLanguage, setSelectedLanguage } = useLanguageContext();

	useEffect(() => {
		const browserLanguage =
			navigator.language.toLowerCase() || navigator.languages[0].toLowerCase();
		const languagePrefix = browserLanguage.split("-")[0] || browserLanguage;
		const defaultLanguage =
			languages.find((language) =>
				language.value.toLowerCase().startsWith(languagePrefix),
			) ||
			// Fallback to English if no matching language is found
			languages.find((language) => language.value.toLowerCase() === "en-us") ||
			null;
		setSelectedLanguage(defaultLanguage);
	}, [setSelectedLanguage]);

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedValue = event.target.value;
		const language =
			languages.find((lang) => lang.value === selectedValue) || null;
		setSelectedLanguage(language);
	};
	return (
		<div className="flex items-center space-x-4">
			<label
				className="text-md text-muted-foreground"
				htmlFor="language-select"
			>
				Target Language
			</label>
			<div className="form-control w-full max-w-xs">
				<select
					id="language-select"
					className="select select-info"
					value={selectedLanguage?.value || "en-us"}
					onChange={handleChange}
				>
					<option value={selectedLanguage?.value}>
						{selectedLanguage?.label || "Select a language"}
					</option>
					{languages
						.filter((language) => language.value !== selectedLanguage?.value)
						.map((language) => (
							<option key={language.value} value={language.value}>
								{language.label}
							</option>
						))}
				</select>
			</div>
		</div>
	);
}
