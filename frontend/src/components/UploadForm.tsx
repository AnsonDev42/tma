import { Language, useLanguageContext } from "@/contexts/LanguageContext.tsx";
import { SessionContext } from "@/contexts/SessionContext.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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

type UploadFormProps = {
	onUploadComplete: (data: DishProps[]) => void;
	setMenuSrc: (src: string | ArrayBuffer | null) => void;
};

const UploadForm: React.FC<UploadFormProps> = ({
	onUploadComplete,
	setMenuSrc,
}) => {
	const session = useContext(SessionContext)?.session;
	const { selectedLanguage } = useLanguageContext();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file: undefined,
		},
		mode: "onChange",
	});

	const onSubmit = async (payload: z.infer<typeof formSchema>) => {
		const file = payload.file[0];
		const formData = new FormData();
		formData.append("file", file);
		formData.append("file_name", file.name);
		if (!session || !session.access_token) {
			alert("Please refresh to login again. No session found.");
			return;
		}
		const jwt = `Bearer ${session.access_token}`;
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			setMenuSrc(reader.result);
		};
		toast.promise(uploadData(formData, jwt, selectedLanguage), {
			loading: "Uploading and analyzing your menu...(This may take a while)",
			success: (data) => {
				onUploadComplete(data);
				return `Menu has been successfully analyzed!`;
			},
			error: (err) => {
				return err.toString();
			},
		});
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
			<label className="form-control w-full max-w-xs">
				<div className="label">
					<span className="label-text">Upload a Menu image</span>
				</div>
				<input
					type="file"
					className="file-input file-input-bordered w-full max-w-xs"
					{...form.register("file")}
				/>
			</label>
			<button type="submit" className="btn btn-primary">
				Upload Menu
			</button>
		</form>
	);
};

async function uploadData(
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
		.map((item) => {
			return {
				id: item.id,
				boundingBox: item.boundingBox,
				info: {
					text: item.info.text,
					imgSrc: item.info.imgSrc,
					description: item.info.description,
				},
			};
		})
		.filter((item) => item !== null) as DishProps[];
}

export default UploadForm;
