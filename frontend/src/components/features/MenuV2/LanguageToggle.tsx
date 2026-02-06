import {
	Language,
	languages,
	useLanguageContext,
} from "@/contexts/LanguageContext";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { useTheme } from "@/contexts/ThemeContext";
import { uploadMenuData } from "@/features/menu/services/menuUploadService";
import { DishProps } from "@/types/DishProps.tsx";
import React, { useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "sonner";

const LanguageToggle: React.FC = () => {
	const { selectedLanguage, setSelectedLanguage } = useLanguageContext();
	const { selectedImage, setDishes } = useMenuV2();
	const { isDark } = useTheme();
	const session = useContext(SessionContext)?.session;
	const isE2EAuthBypassEnabled =
		import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

	const [isOpen, setIsOpen] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [languageToConfirm, setLanguageToConfirm] = useState<Language | null>(
		null,
	);
	const [isProcessing, setIsProcessing] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const confirmationRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
			if (
				confirmationRef.current &&
				!confirmationRef.current.contains(event.target as Node)
			) {
				setShowConfirmation(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleLanguageSelect = (language: (typeof languages)[0]) => {
		if (selectedLanguage?.value === language.value) {
			setIsOpen(false);
			return;
		}

		if (!selectedImage) {
			setSelectedLanguage(language);
			setIsOpen(false);
			return;
		}

		setLanguageToConfirm(language);
		setShowConfirmation(true);
		setIsOpen(false);
	};

	const confirmLanguageChange = async () => {
		if (!languageToConfirm || !selectedImage) {
			setShowConfirmation(false);
			return;
		}

		const jwt =
			session?.access_token !== undefined
				? `Bearer ${session.access_token}`
				: isE2EAuthBypassEnabled
					? "Bearer e2e-auth-bypass"
					: null;

		if (!jwt) {
			toast.error("Please refresh and login before changing language.");
			setShowConfirmation(false);
			return;
		}

		setIsProcessing(true);
		setSelectedLanguage(languageToConfirm);

		const imageSrc = selectedImage.imageSrc;
		const response = await fetch(imageSrc as string);
		const blob = await response.blob();
		const file = new File([blob], "image.jpg", { type: "image/jpeg" });

		const formData = new FormData();
		formData.append("file", file);
		formData.append("file_name", "reprocessed_image.jpg");

		toast.promise(uploadMenuData(formData, jwt, languageToConfirm), {
			loading: `Reprocessing menu with ${languageToConfirm.label}...`,
			success: (data) => {
				setDishes(data as DishProps[]);
				setIsProcessing(false);
				setShowConfirmation(false);
				return `Menu updated in ${languageToConfirm.label}.`;
			},
			error: (error) => {
				setIsProcessing(false);
				setShowConfirmation(false);
				return `Error: ${(error as Error).message}`;
			},
		});
	};

	const confirmationDialog =
		showConfirmation && typeof document !== "undefined"
			? ReactDOM.createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
						<div
							ref={confirmationRef}
							className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
								isDark
									? "border-slate-700 bg-slate-900 text-slate-100"
									: "border-slate-200 bg-white text-slate-800"
							}`}
						>
							<h3 className="text-lg font-semibold">Change language?</h3>
							<p className="mt-2 text-sm text-slate-500">
								Switching to {languageToConfirm?.label} reprocesses the image.
							</p>
							<div className="mt-4 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setShowConfirmation(false)}
									className={`rounded-lg px-3 py-1.5 text-sm ${
										isDark
											? "bg-slate-800 hover:bg-slate-700"
											: "bg-slate-100 hover:bg-slate-200"
									}`}
									disabled={isProcessing}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => {
										void confirmLanguageChange();
									}}
									className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
									disabled={isProcessing}
								>
									{isProcessing ? "Processing..." : "Confirm"}
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)
			: null;

	return (
		<>
			<div className="relative" ref={dropdownRef}>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
						isDark
							? "bg-slate-800 text-slate-200 hover:bg-slate-700"
							: "bg-slate-100 text-slate-700 hover:bg-slate-200"
					}`}
					disabled={isProcessing}
				>
					<span className="mr-1">{selectedLanguage?.label || "Language"}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{isOpen && (
					<div
						className={`absolute right-0 mt-2 max-h-64 w-52 overflow-y-auto rounded-xl border p-1 shadow-xl ${
							isDark
								? "border-slate-700 bg-slate-900"
								: "border-slate-200 bg-white"
						}`}
					>
						{languages.map((language) => (
							<button
								type="button"
								key={language.value}
								onClick={() => handleLanguageSelect(language)}
								className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
									selectedLanguage?.value === language.value
										? isDark
											? "bg-teal-300 text-slate-900"
											: "bg-teal-100 text-teal-900"
										: isDark
											? "text-slate-200 hover:bg-slate-800"
											: "text-slate-700 hover:bg-slate-100"
								}`}
								disabled={isProcessing}
							>
								{language.label}
							</button>
						))}
					</div>
				)}
			</div>

			{confirmationDialog}
		</>
	);
};

export default LanguageToggle;
