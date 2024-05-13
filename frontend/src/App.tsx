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
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import React, { useContext, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "./components/ui/button";

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

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];
const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd29kaGVoenRlbXpjcHNvZnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMjA3MTksImV4cCI6MjAzMDY5NjcxOX0.j4O3aKoITFoJi36sQiPoh5PUWSDwwDDh02hhmMRF8HY",
);

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
const SessionContext = React.createContext(null);

function Authentication() {
	const [session, setSession] = useState(null);

	useEffect(() => {
		const fetchSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setSession(session);
		};

		fetchSession();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);
	useEffect(() => {
		supabase.auth.onAuthStateChange(async (event, _auth) => {
			if (event == "PASSWORD_RECOVERY") {
				const newPassword = prompt(
					"What would you like your new password to be?",
				);
				const { data, error } = await supabase.auth.update({
					password: newPassword,
				});

				if (data) alert("Password updated successfully!");
				if (error) alert("There was an error updating your password.");
			}
		});
	}, []);

	if (!session) {
		return <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />;
	} else {
		return (
			<div className="flex-row">
				<h1>Welcome, {session.user.email}</h1>
				<Button
					onClick={async () => {
						await supabase.auth.signOut();
					}}
				>
					Sign out
				</Button>
			</div>
		);
	}
}

function App() {
	const [session, setSession] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setLoading(false);
		});

		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, []);

	if (loading) {
		return <div>Loading...</div>;
	}
	return (
		<SessionContext.Provider value={session}>
			{session ? (
				<MainAppContent />
			) : (
				<Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
			)}
		</SessionContext.Provider>
	);
}

function MainAppContent() {
	const session = useContext(SessionContext);
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
		const jwt = session.access_token as string;

		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			setMenuSrc(reader.result);
		};
		await uploadData(formData, jwt, setData);
	};
	return (
		<div>
			<Authentication />
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
