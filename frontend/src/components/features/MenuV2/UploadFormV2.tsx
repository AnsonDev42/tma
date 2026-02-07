import { useLanguageContext } from "@/contexts/LanguageContext.tsx";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { demoPresets } from "@/features/menu/config/demoPresets";
import {
	MenuGroupingMode,
	loadDemoMenuData,
	uploadMenuData,
} from "@/features/menu/services/menuUploadService";
import { DemoPreset } from "@/features/menu/types";
import { UploadProps } from "@/types/UploadProps.ts";
import resizeFile from "@/utils/localImageCompmressor.ts";
import { addUploadToLocalStorage } from "@/utils/localStorageUploadUtils.ts";
import React, { useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import UploadLoginPromptSheet from "./UploadLoginPromptSheet";

const MAX_FILE_SIZE = 65 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];
const GROUPING_MODE_OPTIONS: Array<{
	value: MenuGroupingMode;
	label: string;
	description: string;
}> = [
	{
		value: "heuristic",
		label: "Heuristic",
		description: "Fast, no LLM grouping",
	},
	{
		value: "llm",
		label: "LLM-based",
		description: "Layout-aware segment grouping with LLM",
	},
];

type PendingUploadAction =
	| { type: "open-picker" }
	| { type: "upload-file"; file: File }
	| null;

interface UploadFormV2Props {
	theme: string;
	className?: string;
	compact?: boolean;
}

function validateFile(file: File | null): string | null {
	if (!file) {
		return "Image is required.";
	}
	if (file.size > MAX_FILE_SIZE) {
		return "Max image size is 65MB.";
	}
	if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
		return "Only .jpg, .jpeg, .png and .webp formats are supported.";
	}

	return null;
}

async function fileToDataUrl(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read image file."));
		reader.readAsDataURL(file);
	});
}

const UploadFormV2: React.FC<UploadFormV2Props> = ({
	theme,
	className = "",
	compact = false,
}) => {
	const session = useContext(SessionContext)?.session;
	const { selectedLanguage } = useLanguageContext();
	const { selectedImage, setSelectedImage, groupingMode, setGroupingMode } =
		useMenuV2();
	const isE2EAuthBypassEnabled =
		import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
	const [pendingUploadAction, setPendingUploadAction] =
		useState<PendingUploadAction>(null);
	const [isCollapsed, setIsCollapsed] = useState(compact);

	useEffect(() => {
		if (compact) {
			setIsCollapsed(true);
		}
	}, [compact]);

	useEffect(() => {
		if (selectedImage) {
			setIsCollapsed(true);
		}
	}, [selectedImage]);

	const ensureCanUpload = (action: Exclude<PendingUploadAction, null>) => {
		if (isE2EAuthBypassEnabled || session?.access_token) {
			return true;
		}

		setPendingUploadAction(action);
		setIsLoginPromptOpen(true);
		return false;
	};

	const saveUpload = (imageSrc: string, data: UploadProps["data"]) => {
		const newUpload: UploadProps = {
			imageSrc,
			data,
			timestamp: new Date().toISOString(),
		};

		addUploadToLocalStorage(newUpload);
		setSelectedImage(newUpload);
	};

	const processFile = async (
		rawFile: File,
		options?: { skipAuthGate?: boolean },
	) => {
		if (
			!options?.skipAuthGate &&
			!ensureCanUpload({ type: "upload-file", file: rawFile })
		) {
			return;
		}

		const validationError = validateFile(rawFile);
		if (validationError) {
			setErrorMessage(validationError);
			toast.error(validationError);
			return;
		}

		setErrorMessage(null);
		setIsLoading(true);

		try {
			const compressedFile = await resizeFile(rawFile);
			const formData = new FormData();
			formData.append("file", compressedFile);
			formData.append(
				"file_name",
				`${rawFile.name.split(".")[0]}_compressed.jpg`,
			);

			const jwt =
				session?.access_token !== undefined
					? `Bearer ${session.access_token}`
					: isE2EAuthBypassEnabled
						? "Bearer e2e-auth-bypass"
						: null;

			if (!jwt) {
				throw new Error("Please sign in before uploading a menu.");
			}

			const imageSrc = await fileToDataUrl(compressedFile);

			await toast.promise(
				uploadMenuData(formData, jwt, selectedLanguage, groupingMode),
				{
					loading:
						"Uploading and analyzing your menu...(This may take a while)",
					success: (data) => {
						saveUpload(imageSrc, data);
						return "Menu has been successfully analyzed!";
					},
					error: (error) =>
						(error as Error).message || "Failed to process menu image.",
				},
			);
		} catch (error) {
			toast.error((error as Error).message || "Failed to process menu image.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDemoSubmit = async (preset: DemoPreset) => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			await toast.promise(loadDemoMenuData(preset.dataUrl), {
				loading: `Loading ${preset.label}...`,
				success: (data) => {
					saveUpload(preset.imageSrc, data);
					return "Demo menu has been analyzed. Tap dish cards to review menu locations.";
				},
				error: (error) =>
					(error as Error).message || "Failed to load demo data.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const triggerFilePicker = () => {
		if (isLoading) {
			return;
		}

		if (!ensureCanUpload({ type: "open-picker" })) {
			return;
		}

		inputRef.current?.click();
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		const droppedFile = event.dataTransfer.files?.[0] ?? null;
		if (droppedFile) {
			void processFile(droppedFile);
		}
	};

	const handleLoginSuccess = () => {
		setIsLoginPromptOpen(false);
		const actionToResume = pendingUploadAction;
		setPendingUploadAction(null);

		if (!actionToResume) {
			return;
		}

		if (actionToResume.type === "open-picker") {
			window.setTimeout(() => {
				inputRef.current?.click();
			}, 220);
			return;
		}

		void processFile(actionToResume.file, { skipAuthGate: true });
	};

	return (
		<div
			className={`w-full rounded-2xl border transition-all duration-200 ${
				theme === "dark"
					? "border-slate-700 bg-slate-900/80"
					: "border-slate-300 bg-slate-50/95"
			} ${isDragging ? "ring-2 ring-teal-400" : ""} ${
				isLoading ? "opacity-80 pointer-events-none" : ""
			} ${className}`}
			onDragOver={(event) => {
				event.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={(event) => {
				event.preventDefault();
				setIsDragging(false);
			}}
			onDrop={handleDrop}
		>
			<div className="flex flex-col gap-4 p-4 sm:p-5">
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p
								className={`text-xs font-semibold uppercase tracking-[0.18em] ${
									theme === "dark" ? "text-teal-300" : "text-teal-700"
								}`}
							>
								Menu Input
							</p>
							<h2
								className={`text-lg font-semibold ${
									theme === "dark" ? "text-white" : "text-slate-800"
								}`}
							>
								Upload once, review dish list fast
							</h2>
							{!isCollapsed && (
								<p
									className={`text-sm ${
										theme === "dark" ? "text-slate-400" : "text-slate-600"
									}`}
								>
									Drag an image anywhere on this panel or use the upload button.
								</p>
							)}
						</div>

						{selectedImage && (
							<button
								type="button"
								onClick={() => setIsCollapsed((previous) => !previous)}
								className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
									theme === "dark"
										? "bg-slate-800 text-slate-200 hover:bg-slate-700"
										: "bg-slate-200 text-slate-700 hover:bg-slate-300"
								}`}
							>
								{isCollapsed ? "Expand" : "Collapse"}
							</button>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={triggerFilePicker}
							className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
								theme === "dark"
									? "bg-teal-400 text-slate-900 hover:bg-teal-300"
									: "bg-teal-600 text-white hover:bg-teal-500"
							}`}
						>
							Upload menu image
						</button>
						<span
							className={`rounded-full border px-3 py-1 text-xs ${
								theme === "dark"
									? "border-slate-700 text-slate-400"
									: "border-slate-300 text-slate-600"
							}`}
						>
							Max 65MB
						</span>
						<label
							className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
								theme === "dark"
									? "border-slate-700 text-slate-300"
									: "border-slate-300 text-slate-700"
							}`}
						>
							<span>Grouping</span>
							<select
								value={groupingMode}
								onChange={(event) =>
									setGroupingMode(event.target.value as MenuGroupingMode)
								}
								className={`bg-transparent text-xs focus:outline-none ${
									theme === "dark" ? "text-slate-100" : "text-slate-800"
								}`}
								disabled={isLoading}
							>
								{GROUPING_MODE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<p
						className={`text-xs ${
							theme === "dark" ? "text-slate-500" : "text-slate-600"
						}`}
					>
						{
							GROUPING_MODE_OPTIONS.find(
								(option) => option.value === groupingMode,
							)?.description
						}
					</p>
				</div>

				{!isCollapsed && (
					<div>
						{errorMessage && (
							<p className="mb-3 text-sm text-red-500">{errorMessage}</p>
						)}

						<div className="grid gap-2 sm:grid-cols-2">
							{demoPresets.map((preset) => (
								<button
									type="button"
									key={preset.id}
									onClick={() => {
										void handleDemoSubmit(preset);
									}}
									disabled={isLoading}
									className={`group flex items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
										theme === "dark"
											? "border-slate-700 hover:border-slate-500"
											: "border-slate-200 hover:border-slate-400"
									}`}
								>
									<img
										src={preset.imageSrc}
										alt={`${preset.label} preview`}
										className="h-14 w-14 rounded-lg object-cover"
									/>
									<div className="min-w-0">
										<p
											className={`text-sm font-semibold ${
												theme === "dark" ? "text-white" : "text-slate-800"
											}`}
										>
											{preset.label}
										</p>
										<p
											className={`line-clamp-2 text-xs ${
												theme === "dark" ? "text-slate-400" : "text-slate-600"
											}`}
										>
											{preset.description}
										</p>
										<span
											className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${
												theme === "dark"
													? "bg-slate-800 text-slate-300"
													: "bg-slate-100 text-slate-700"
											}`}
										>
											{preset.languageLabel}
										</span>
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				<input
					ref={inputRef}
					type="file"
					id="file-upload"
					className="hidden"
					accept={ACCEPTED_IMAGE_TYPES.join(",")}
					onChange={(event) => {
						const selectedFile = event.target.files?.[0] ?? null;
						if (selectedFile) {
							void processFile(selectedFile);
						}
						event.target.value = "";
					}}
				/>
			</div>
			<UploadLoginPromptSheet
				isOpen={isLoginPromptOpen}
				onClose={() => {
					setIsLoginPromptOpen(false);
					setPendingUploadAction(null);
				}}
				onSuccess={handleLoginSuccess}
				theme={theme}
			/>
		</div>
	);
};

export default UploadFormV2;
