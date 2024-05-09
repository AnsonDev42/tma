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
import { demoData, uploadData } from "@/components/dish.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
		// formData.append("file_name", file.name);

		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			setMenuSrc(reader.result);
		};
		await uploadData(formData, setData);
	};

	return (
		<div className="w-full justify-center">
			<div className="min-w-screen-xl">
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
				<div className="grid w-full max-w-sm items-center gap-1.5"></div>
			</div>
			{menuSrc && (
				<div className="static">
					{data.map((value, index) => {
						return (
							<Dialog key={index}>
								<DialogTrigger asChild>
									<div
										key={index}
										className="absolute z-10 bg-red-300/30"
										style={{
											width: `${value.boundingBox.w}%`,
											height: `${value.boundingBox.h}%`,
											left: `${value.boundingBox.x}%`,
											top: `${value.boundingBox.y}%`,
										}}
									></div>
								</DialogTrigger>
								<DialogContent className="sm:max-w-md">
									<h2>{value.info.text}</h2>
									{value.info.imgSrc && (
										<img
											src={value.info.imgSrc}
											alt={`${value.info.text}-image`}
										></img>
									)}
									<p>{value.info.description}</p>
								</DialogContent>
							</Dialog>
						);
					})}
					<img src={menuSrc as string} alt="menu" />
				</div>
			)}
		</div>
	);
}

export default App;
