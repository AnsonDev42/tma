import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import * as changeKeys from "change-case/keys";
import React, { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Language, useLanguageContext } from "@/contexts/LanguageContext.tsx";
import { useMenuV2 } from "@/contexts/MenuV2Context";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { BoundingBoxProps, DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import resizeFile from "@/utils/localImageCompmressor.ts";
import { addUploadToLocalStorage } from "@/utils/localStorageUploadUtils.ts";

const MAX_FILE_SIZE = 65 * 1024 * 1024; // 65MB
const ACCEPTED_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

const formSchema = z.object({
	file: z
		.instanceof(FileList)
		.refine((fileList) => fileList.length > 0, "Image is required.")
		.refine(
			(fileList) => fileList.length <= 1,
			"Cannot upload more than 1 image",
		)
		.refine((file) => file[0].size <= MAX_FILE_SIZE, "Max image size is 65MB.")
		.refine(
			(file) => ACCEPTED_IMAGE_TYPES.includes(file[0].type),
			"Only .jpg, .jpeg, .png and .webp formats are supported.",
		),
});

interface UploadFormV2Props {
	theme: string;
}

const UploadFormV2: React.FC<UploadFormV2Props> = ({ theme }) => {
	const session = useContext(SessionContext)?.session;
	const isE2EAuthBypassEnabled =
		import.meta.env.VITE_E2E_AUTH_BYPASS === "true";
	const { selectedLanguage } = useLanguageContext();
	const { setSelectedImage, setDishes } = useMenuV2();
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const formMethods = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file: undefined,
		},
		mode: "onChange",
	});

	const handleSubmit = async (payload: z.infer<typeof formSchema>) => {
		setIsLoading(true);
		const raw_file: File = payload.file[0];
		console.log("Size of the original file: ", raw_file.size);

		if (!raw_file) {
			toast.error("No file selected.");
			setIsLoading(false);
			return;
		}

		let file;
		try {
			file = await resizeFile(raw_file);
			console.log("Size of the compressed file: ", file.size);
		} catch (_error) {
			toast.error("Failed to compress image: (image format not supported)");
			setIsLoading(false);
			return;
		}

		const formData = new FormData();
		formData.append("file", file);
		formData.append(
			"file_name",
			raw_file.name.split(".")[0] + "_compressed.jpg",
		);

		const jwt =
			session?.access_token !== undefined
				? `Bearer ${session.access_token}`
				: isE2EAuthBypassEnabled
					? "Bearer e2e-auth-bypass"
					: null;

		if (!jwt) {
			toast.error("Please refresh to login again. No session found.");
			setIsLoading(false);
			return;
		}
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () =>
			processFileRead(reader.result as string, formData, jwt);
	};

	const processFileRead = async (
		imageSrc: string,
		formData: FormData,
		jwt: string,
	) => {
		toast.promise(uploadMenuData(formData, jwt, selectedLanguage), {
			loading: "Uploading and analyzing your menu...(This may take a while)",
			success: (data) => {
				const newUpload: UploadProps = {
					imageSrc,
					data,
					timestamp: new Date().toISOString(),
				} as UploadProps;

				addUploadToLocalStorage(newUpload);
				setSelectedImage(newUpload);
				setDishes(data);
				setIsLoading(false);
				return `Menu has been successfully analyzed!`;
			},
			error: (err) => {
				setIsLoading(false);
				return err.toString();
			},
		});
	};

	const handleDemoSubmit = async (imageSrc: string, demoDataUrl: string) => {
		setIsLoading(true);
		toast.promise(
			(async () => {
				await new Promise((resolve) => setTimeout(resolve, 500));
				const response = await fetch(demoDataUrl);
				const data = await response.json();
				const formattedData = formatResponseData(data.results);

				const newUpload: UploadProps = {
					imageSrc,
					data: formattedData,
					timestamp: new Date().toISOString(),
				} as UploadProps;

				addUploadToLocalStorage(newUpload);
				setSelectedImage(newUpload);
				setDishes(formattedData);
				setIsLoading(false);
				return formattedData;
			})(),
			{
				loading: "Uploading and analyzing your demo menu...",
				success:
					"Demo menu has been successfully analyzed! Try clicking the dishes.",
				error: (_err) => {
					setIsLoading(false);
					return "Failed to load demo data.";
				},
			},
		);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			formMethods.setValue("file", e.dataTransfer.files);
			formMethods.handleSubmit(handleSubmit)();
		}
	};

	return (
		<div className="w-full">
			<form onSubmit={formMethods.handleSubmit(handleSubmit)}>
				<div
					className={`
            w-full p-6 rounded-xl transition-all duration-200
            ${isDragging ? "border-blue-500 border-2" : "border border-dashed"}
            ${
							theme === "dark"
								? "bg-slate-700 border-slate-500 text-white"
								: "bg-white border-slate-300 text-slate-700"
						}
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className="flex flex-col items-center justify-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className={`h-16 w-16 mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1}
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>

						<p className="text-lg font-medium mb-2">
							{isDragging
								? "Drop your menu image here"
								: "Drag & drop your menu image here"}
						</p>

						<p
							className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
						>
							or click to browse files
						</p>

						<input
							type="file"
							className="hidden"
							id="file-upload"
							{...formMethods.register("file")}
							onChange={(e) => {
								formMethods.register("file").onChange(e);
								if (e.target.files && e.target.files.length > 0) {
									formMethods.handleSubmit(handleSubmit)();
								}
							}}
						/>

						<label
							htmlFor="file-upload"
							className={`
                px-4 py-2 rounded-md cursor-pointer transition-colors
                ${
									theme === "dark"
										? "bg-blue-600 hover:bg-blue-700 text-white"
										: "bg-blue-500 hover:bg-blue-600 text-white"
								}
              `}
						>
							Browse Files
						</label>

						{formMethods.formState.errors.file && (
							<p className="mt-2 text-red-500 text-sm">
								{formMethods.formState.errors.file.message}
							</p>
						)}
					</div>
				</div>
			</form>

			<div className="flex justify-center mt-4 space-x-4">
				<button
					type="button"
					onClick={() => handleDemoSubmit("/demoMenu1.jpg", "/demoDataEN.json")}
					className={`
            px-4 py-2 rounded-md transition-colors
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
            ${
							theme === "dark"
								? "bg-slate-700 hover:bg-slate-600 text-white"
								: "bg-slate-200 hover:bg-slate-300 text-slate-700"
						}
          `}
					disabled={isLoading}
				>
					Try English Demo
				</button>

				<button
					type="button"
					onClick={() => handleDemoSubmit("/demoMenu1.jpg", "/demoDataCN.json")}
					className={`
            px-4 py-2 rounded-md transition-colors
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
            ${
							theme === "dark"
								? "bg-slate-700 hover:bg-slate-600 text-white"
								: "bg-slate-200 hover:bg-slate-300 text-slate-700"
						}
          `}
					disabled={isLoading}
				>
					Try Chinese Demo
				</button>
			</div>
		</div>
	);
};

export async function uploadMenuData(
	formData: FormData,
	jwt: string,
	selectedLanguage: Language | null,
): Promise<DishProps[]> {
	try {
		const response = await axios.post(`${__API_URL__}/menu/analyze`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
				Authorization: jwt,
				"Accept-Language": selectedLanguage?.value || "en",
			},
		});

		const formattedData = formatResponseData(response.data.results);
		if (formattedData.length > 0) {
			return formattedData;
		} else {
			toast.error("No valid data received.");
			return [];
		}
	} catch (error) {
		throw new Error(
			`Failed to send: ${(error as Error).message || "Unknown error"}`,
		);
	}
}

type ResponseDataItem = {
	info?: {
		text?: string;
		img_src?: string[];
		description?: string;
		text_translation?: string;
		[key: string]: unknown;
	};
	boundingBox?: BoundingBoxProps;
	[key: string]: unknown;
};

function formatResponseData(results: ResponseDataItem[]): DishProps[] {
	return results
		.map((item, index) => {
			// fix the keys to camelCase e.g. img_src -> imgSrc
			if (item.info) {
				item.info = changeKeys.camelCase(item.info) as DishProps["info"];
			}
			return {
				...item,
				id: index,
				info: item.info || {},
				boundingBox: item.boundingBox || { x: 0, y: 0, w: 0, h: 0 },
			} as DishProps;
		})
		.filter((item) => {
			const name = item.info?.text?.trim().toLowerCase();
			return (
				item &&
				item.info &&
				item.info.text &&
				name !== "unknow" &&
				item.boundingBox &&
				typeof item.boundingBox.x === "number" &&
				typeof item.boundingBox.y === "number" &&
				typeof item.boundingBox.w === "number" &&
				typeof item.boundingBox.h === "number"
			);
		});
}

export default UploadFormV2;
