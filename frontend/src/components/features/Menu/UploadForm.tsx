import { HistoryProps } from "@/components/types/HistoryProps.ts";
import { Language, useLanguageContext } from "@/contexts/LanguageContext.tsx";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import resizeFile from "@/utils/localImageCompmressor.ts";
import { addUploadToLocalStorage } from "@/utils/localStorageUploadUtils.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import * as changeKeys from "change-case/keys";
import React, { useContext } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
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
		.refine((file) => file[0].size <= MAX_FILE_SIZE, "Max image size is 25MB.")
		.refine(
			(file) => ACCEPTED_IMAGE_TYPES.includes(file[0].type),
			"Only .jpg, .jpeg, .png and .webp formats are supported.",
		),
});

const UploadForm: React.FC<HistoryProps> = ({ onSelectUpload }) => {
	const session = useContext(SessionContext)?.session;
	const { selectedLanguage } = useLanguageContext();
	const formMethods = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file: undefined,
		},
		mode: "onChange",
	});

	const handleSubmit = async (payload: z.infer<typeof formSchema>) => {
		const raw_file: File = payload.file[0];
		console.log("size of the original file: ", raw_file.size);
		// resize file
		if (!raw_file) {
			alert("No file selected.");
			return;
		}
		const file = await resizeFile(raw_file);
		console.log("size of the compressed file: ", file.size);

		const formData = new FormData();
		formData.append("file", file);
		formData.append(
			"file_name",
			raw_file.name.split(".")[0] + "_compressed.jpg",
		);
		if (!session || !session.access_token) {
			alert("Please refresh to login again. No session found.");
			return;
		}
		const jwt = `Bearer ${session.access_token}`;
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
				onSelectUpload(newUpload);
				return `Menu has been successfully analyzed!`;
			},
			error: (err) => err.toString(),
		});
	};

	const handleDemoSubmit = async (imageSrc: string, demoDataUrl: string) => {
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
				onSelectUpload(newUpload);

				return formattedData;
			})(),
			{
				loading:
					"Uploading and analyzing your demo menu...(This may take a while)",
				success:
					"Demo menu has been successfully analyzed! Try click the dishes.",
				error: "Failed to load demo data.",
			},
		);
	};

	return (
		<form
			onSubmit={formMethods.handleSubmit(handleSubmit)}
			className="space-y-8"
		>
			<label className="form-control w-full max-w-xs">
				<input
					type="file"
					className="file-input file-input-bordered w-full max-w-xs"
					{...formMethods.register("file")}
				/>
			</label>

			<button type="submit" className="btn btn-primary">
				Upload Menu
			</button>
			<button
				type="button"
				className="btn btn-secondary ml-5"
				onClick={() => handleDemoSubmit("/demoMenu1.jpg", "/demoDataEN.json")}
			>
				Try Demo
			</button>
			<button
				type="button"
				className="btn btn-secondary ml-5"
				onClick={() => handleDemoSubmit("/demoMenu1.jpg", "/demoDataCN.json")}
			>
				Try zh-CN
			</button>
		</form>
	);
};

async function uploadMenuData(
	formData: FormData,
	jwt: string,
	selectedLanguage: Language | null,
): Promise<DishProps[]> {
	try {
		const response = await axios.post(
			"https://api.itsya0wen.com/upload",
			formData,
			{
				headers: {
					"Content-Type": "multipart/form-data",
					Authorization: jwt,
					"Accept-Language": selectedLanguage?.value || "en",
				},
			},
		);

		const formattedData = formatResponseData(response.data.results);
		if (formattedData.length > 0) {
			return formattedData;
		} else {
			throw new Error("No valid data received.");
		}
	} catch (error) {
		throw new Error(
			`Failed to send: ${(error as Error).message || "Unknown error"}`,
		);
	}
}

function formatResponseData(results: DishProps[]) {
	return results
		.map((item, index) => {
			// fix the keys to camelCase e.g. img_src -> imgSrc
			item.info = changeKeys.camelCase(item.info) as DishProps["info"];
			return {
				id: index,
				boundingBox: item.boundingBox,
				info: {
					text: item.info.text,
					imgSrc: item.info.imgSrc,
					description: item.info.description,
					textTranslation: item.info.textTranslation,
				},
			} as DishProps;
		})
		.filter((item) => item.info.text !== null) as DishProps[];
}

export default UploadForm;
