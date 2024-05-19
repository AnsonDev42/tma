import {
	Language,
	languages,
	useLanguageContext,
} from "@/contexts/LanguageContext.tsx";
import { useEffect, useState } from "react";

export function LanguageComboBox() {
	const { selectedLanguage, setSelectedLanguage } = useLanguageContext();
	const [localSelectedLanguage, setLocalSelectedLanguage] =
		useState<Language | null>(selectedLanguage);

	// set default language based on browser language
	useEffect(() => {
		if (!selectedLanguage) {
			const browserLanguage = navigator.language || navigator.languages[0];
			// Get the main language part e.g. "zh" from "zh-cn"
			const languagePrefix = browserLanguage.split("-")[0];
			const defaultLanguage =
				languages.find((language) =>
					language.value.startsWith(languagePrefix),
				) ||
				languages.find((language) => language.value === "en") ||
				null;
			setSelectedLanguage(defaultLanguage as Language);
			setLocalSelectedLanguage(defaultLanguage as Language);
		}
	}, [selectedLanguage, setSelectedLanguage]);

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedValue = event.target.value;
		const language =
			languages.find((lang) => lang.value === selectedValue) || null;
		setSelectedLanguage(language);
		setLocalSelectedLanguage(language);
	};

	return (
		<div className="flex items-center space-x-4">
			<label
				className="text-md text-muted-foreground"
				htmlFor="language-select"
			>
				Translate to a language.
			</label>
			<div className="form-control w-full max-w-xs">
				<select
					id="language-select"
					className="select select-info"
					value={localSelectedLanguage?.value || ""}
					onChange={handleChange}
				>
					<option disabled value="">
						Select language...
					</option>
					{languages.map((language) => (
						<option key={language.value} value={language.value}>
							{language.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
