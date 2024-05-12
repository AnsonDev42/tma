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
import {
	BoundingBoxProps,
	DishProps,
	demoData,
	uploadData,
} from "@/components/dish.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
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
	const [data, setData] = useState(demoData);
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

interface ImageResultsProps {
	menuSrc: string | ArrayBuffer | null;
	data: DishProps[];
	imageRef: React.RefObject<HTMLImageElement>;
}

function ImageResults({
	menuSrc,
	data,
	imageRef,
}: ImageResultsProps): React.ReactElement {
	const [imgWidth, setImgWidth] = useState(0);
	const [imgHeight, setImgHeight] = useState(0);

	useEffect(() => {
		const updateScale = () => {
			const imageElement = imageRef.current;
			if (imageElement) {
				const renderedWidth = imageElement.clientWidth;
				const renderedHeight = imageElement.clientHeight;
				setImgWidth(renderedWidth);
				setImgHeight(renderedHeight);
			}
		};

		window.addEventListener("resize", updateScale);
		window.addEventListener("load", updateScale);
		window.addEventListener("DOMContentLoaded", updateScale);
		window.addEventListener("readystatechange", updateScale);

		// Initial scale update when the image loads
		updateScale();

		return () => window.removeEventListener("resize", updateScale);
	}, [imageRef, data]);

	const getAdjustedStyles = (boundingBox: BoundingBoxProps) => {
		// Calculate adjusted bounding box based on the image scale
		return {
			width: `${boundingBox.w * imgWidth}px`,
			height: `${boundingBox.h * imgHeight}px`,
			left: `${boundingBox.x * imgWidth}px`,
			top: `${boundingBox.y * imgHeight}px`,
			background: "rgba(255, 0, 0, 0.5)",
			border: "1px solid red",
		};
	};

	return (
		<div className="relative">
			<img
				src={menuSrc as string}
				alt="Uploaded"
				ref={imageRef}
				className="absolute max-w-lg"
			/>
			{data.map((value, index) => {
				return (
					<div>
						<Dialog key={index}>
							<DialogTrigger asChild>
								<div
									key={index}
									className="absolute"
									style={getAdjustedStyles(value.boundingBox)}
								>
									<p>{value.info.text}</p>
								</div>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<h2>{value.info.text}</h2>
								{value.info.imgSrc && (
									<img
										src={value.info.imgSrc}
										alt={`${value.info.text} image`}
									/>
								)}
								<p>{value.info.description}</p>
							</DialogContent>
						</Dialog>
					</div>
				);
			})}
		</div>
	);
}
export default App;
