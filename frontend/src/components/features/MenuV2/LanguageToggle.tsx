import { uploadMenuData } from "@/components/features/MenuV2/UploadFormV2";
import {
	Language,
	languages,
	useLanguageContext,
} from "@/contexts/LanguageContext";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import React, { useState, useRef, useEffect } from "react";
import { useContext } from "react";
import { toast } from "sonner";

const LanguageToggle: React.FC = () => {
	const { selectedLanguage, setSelectedLanguage } = useLanguageContext();
	const { selectedImage, setDishes } = useMenuV2();
	const session = useContext(SessionContext)?.session;
	const [isOpen, setIsOpen] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [languageToConfirm, setLanguageToConfirm] = useState<Language | null>(
		null,
	);
	const [isProcessing, setIsProcessing] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const confirmationRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
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

		// If no image is uploaded yet, just change the language without confirmation
		if (!selectedImage) {
			setSelectedLanguage(language);
			setIsOpen(false);
			return;
		}

		// Otherwise, show confirmation dialog
		setLanguageToConfirm(language);
		setShowConfirmation(true);
		setIsOpen(false);
	};

	const confirmLanguageChange = async () => {
		if (!languageToConfirm || !selectedImage || !session?.access_token) {
			setShowConfirmation(false);
			return;
		}

		setIsProcessing(true);
		setSelectedLanguage(languageToConfirm);

		// Get the original image data
		const imageSrc = selectedImage.imageSrc;

		// Create FormData with the original image
		const response = await fetch(imageSrc as string);
		const blob = await response.blob();
		const file = new File([blob], "image.jpg", { type: "image/jpeg" });

		const formData = new FormData();
		formData.append("file", file);
		formData.append("file_name", "reprocessed_image.jpg");

		const jwt = `Bearer ${session.access_token}`;

		// Reprocess the image with the new language
		toast.promise(uploadMenuData(formData, jwt, languageToConfirm), {
			loading: `Reprocessing menu with ${languageToConfirm.label}... (This may take a while)`,
			success: (data) => {
				// Update the dishes with the new language data
				setDishes(data as DishProps[]);
				setIsProcessing(false);
				setShowConfirmation(false);
				return `Menu has been successfully reprocessed in ${languageToConfirm.label}!`;
			},
			error: (err) => {
				setIsProcessing(false);
				setShowConfirmation(false);
				return `Error reprocessing menu: ${err.toString()}`;
			},
		});
	};

	const cancelLanguageChange = () => {
		setLanguageToConfirm(null);
		setShowConfirmation(false);
	};

	return (
		<>
			<div className="relative" ref={dropdownRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center px-3 py-1 rounded-md bg-slate-300 text-slate-700 shadow hover:bg-slate-400 transition-colors"
					disabled={isProcessing}
				>
					<span className="mr-1">{selectedLanguage?.label || "Language"}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-4 w-4 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
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
					<div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
						<div className="py-1">
							{languages.map((language) => (
								<button
									key={language.value}
									onClick={() => handleLanguageSelect(language)}
									className={`
                    w-full text-left px-4 py-2 text-sm
                    ${
											selectedLanguage?.value === language.value
												? "bg-blue-100 text-blue-900"
												: "text-gray-700 hover:bg-gray-100"
										}
                  `}
									disabled={isProcessing}
								>
									{language.label}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Confirmation Dialog */}
			{showConfirmation && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div
						ref={confirmationRef}
						className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
					>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Change Language?
						</h3>
						<p className="text-gray-700 mb-4">
							Changing the language to {languageToConfirm?.label} will reprocess
							the menu image. This may take some time. Do you want to continue?
						</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={cancelLanguageChange}
								className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
								disabled={isProcessing}
							>
								Cancel
							</button>
							<button
								onClick={confirmLanguageChange}
								className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center"
								disabled={isProcessing}
							>
								{isProcessing ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processing...
									</>
								) : (
									"Confirm"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default LanguageToggle;
