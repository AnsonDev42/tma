import { useForm } from "react-hook-form";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "./components/ui/form";
import { Input } from "./components/ui/input";
import "./globals.css";
import { ImageResults } from "@/components/dish.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "./components/ui/button";

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

function App() {
	const [menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [data, setData] = useState([] as DishProps[]);
	const imageRef = useRef(null);
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

		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			setMenuSrc(reader.result);
		};
		await uploadData(formData, setData);
	};

	return (
		<div>
			<div className="max-w-lg">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						<FormField
							control={form.control}
							name="file"
							render={() => (
								<FormItem>
									<FormLabel>Upload an image</FormLabel>
									<FormControl>
										<Input type="file" {...form.register("file")} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit">Submit</Button>
					</form>
				</Form>
				<div className="w-full"></div>
			</div>
			{menuSrc && (
				<ImageResults menuSrc={menuSrc} data={data} imageRef={imageRef} />
			)}
		</div>
	);
}

export type BoundingBoxProps = {
	x: number;
	y: number;
	w: number;
	h: number;
};

export type DishProps = {
	id: number;
	boundingBox: BoundingBoxProps;
	info: {
		text: string;
		imgSrc: string;
		description: string;
	};
};

export function formatResponseData(results: DishProps[]) {
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

export async function uploadData(
	formData: FormData,
	setData: React.Dispatch<React.SetStateAction<DishProps[]>>,
) {
	try {
		const response = await axios.post(
			"https://api.itsya0wen.com/upload",
			formData,
			{
				headers: { "Content-Type": "multipart/form-data" },
			},
		);

		const formattedData = formatResponseData(response.data.results);
		if (formattedData.length > 0) {
			setData(formattedData);
		} else {
			console.error("No valid data received.");
			alert("No valid data to display.");
		}
	} catch (error) {
		console.error("Failed to send:", (error as string) || "No response");
		alert("Failed to send: " + ((error as string) || "Unknown error"));
	}
}

export default App;
