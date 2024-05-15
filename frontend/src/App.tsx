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
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command.tsx";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Session } from "@supabase/gotrue-js/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
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
const SessionContext = React.createContext<Session | null>(null);
const LanguageContext = React.createContext<{
	selectedLanguage: Language | null;
	setSelectedLanguage: (language: Language | null) => void;
}>({
	selectedLanguage: null,
	setSelectedLanguage: (_language: Language | null) => {
		null;
	},
});
type Language = {
	value: string;
	label: string;
};
const languages: Language[] = [
	{ value: "zh-CN", label: "简体中文" },
	{ value: "zh-TW", label: "繁體中文" },
	{ value: "en", label: "English" },
	{ value: "ja", label: "日本語" },
	{ value: "ko", label: "한국어" },
	{ value: "fr", label: "Français" },
	{ value: "de", label: "Deutsch" },
	{ value: "es", label: "Español" },
];

export function LanguageComboBox() {
	const [open, setOpen] = React.useState(false);
	const { selectedLanguage, setSelectedLanguage } = useContext(LanguageContext);
	// set default language based on browser language
	useEffect(() => {
		if (!selectedLanguage) {
			const browserLanguage = navigator.language || navigator.languages[0];
			// Get the main language part e.g. "zh" from "zh-cn"
			const languagePrefix = browserLanguage.split("-")[0];
			const defaultLanguage =
				languages.find((language) =>
					language.value.startsWith(languagePrefix),
				) ||
				languages.find((language) => language.value === "en") ||
				null;
			setSelectedLanguage(defaultLanguage);
		}
	}, [selectedLanguage, setSelectedLanguage]);

	return (
		<div className="flex items-center space-x-4">
			<p className="text-sm text-muted-foreground">Target Language</p>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className="w-[200px] justify-between">
						{selectedLanguage
							? languages.find(
									(language) => language.value === selectedLanguage.value,
								)?.label
							: "Select language..."}
						<CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0">
					<Command>
						<CommandInput placeholder="Change language..." />
						<CommandList>
							<CommandEmpty>No results found.</CommandEmpty>
							<CommandGroup>
								{languages.map((status) => (
									<CommandItem
										key={status.value}
										value={status.value}
										onSelect={(value: string) => {
											setSelectedLanguage(
												languages.find(
													(priority) => priority.value === value,
												) || null,
											);
											setOpen(false);
										}}
									>
										{status.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
function Authentication() {
	const [session, setSession] = useState<Session | null>(null);
	const [captchaToken, setCaptchaToken] = useState<string>("");

	useEffect(() => {
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
				const newPassword = prompt("Enter your a new password ");
				const { data, error } = await supabase.auth.updateUser({
					password: newPassword as string,
				});

				if (data) {
					toast.info("Password updated successfully!");
				}
				if (error) {
					alert("There was an error updating your password.");
				}
			}
		});
	}, []);
	async function handleAnonymousSignIn() {
		try {
			const {
				data: { session },
				error,
			} = await supabase.auth.signInAnonymously({ options: { captchaToken } });
			if (error) {
				throw error;
			}
			toast.success("Signed in anonymously!");
			setSession(session);
		} catch (_error) {
			console.error("Error signing in anonymously.");
			alert("Failed to sign in anonymously.");
			toast.error("Failed to sign in anonymously.");
		}
	}
	if (!session) {
		return (
			<div className="flex items-center justify-center max-w-full mt-5">
				<div className="flex-col items-center justify-center">
					<Auth
						supabaseClient={supabase}
						appearance={{
							theme: ThemeSupa,
							variables: {
								default: {
									colors: {
										brand: "green",
										brandAccent: "darkgreen",
									},
								},
							},
						}}
						providers={["google", "github"]}
					/>
					<h1>Demo Sign in : </h1>
					<Button onClick={handleAnonymousSignIn} className="m-3">
						Sign in anonymously
					</Button>
					<Turnstile
						siteKey="0x4AAAAAAAaDaYB6f6UNZHsB"
						onSuccess={(token) => {
							setCaptchaToken(token);
						}}
					/>
				</div>
			</div>
		);
	} else {
		return (
			<div className="flex-row">
				<h1>Welcome, {session.user.email}</h1>
				<Button
					onClick={async () => {
						await supabase.auth.signOut();
						toast.success("Signed out successfully!");
					}}
				>
					Sign out
				</Button>
			</div>
		);
	}
}

function App() {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedLanguage, setSelectedLanguage] =
		React.useState<Language | null>(null);

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
		<div>
			<Toaster position="top-center" richColors />
			<LanguageContext.Provider
				value={{ selectedLanguage, setSelectedLanguage }}
			>
				<SessionContext.Provider value={session}>
					{session ? <MainAppContent /> : <Authentication />}
				</SessionContext.Provider>
			</LanguageContext.Provider>
		</div>
	);
}

function MainAppContent() {
	const session = useContext(SessionContext) as Session;
	const [showText, setShowText] = useState(true); // show bounding box text
	const [menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [data, setData] = useState([] as DishProps[]);
	const imageRef = useRef(null);
	const imageResultsRef = useRef<HTMLDivElement | null>(null);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			file: undefined,
		},
		mode: "onChange",
	});
	const { selectedLanguage } = useContext(LanguageContext);
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
				setData(data);
				return `Menu have been successfully analyzed!`;
			},
			error: (err) => {
				return err.toString();
			},
		});
	};

	useEffect(() => {
		if (imageResultsRef.current) {
			imageResultsRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [menuSrc, showText, data]);

	const handleToggleText = () => {
		setShowText((prevShowText) => !prevShowText);
	};

	return (
		<div>
			<LanguageComboBox />
			<Authentication />
			<h1 className="text-3xl font-bold text-center mt-5">Menu Analyzer</h1>
			<div className="max-w-lg">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						<FormField
							control={form.control}
							name="file"
							render={() => (
								<FormItem>
									<FormLabel>Upload a Menu image</FormLabel>
									<FormControl>
										<Input type="file" {...form.register("file")} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit">Upload</Button>
					</form>
				</Form>
				<div className="w-full"></div>
			</div>
			{/* Toggle for showing/hiding text */}
			<div className="mt-4">
				<div className="flex items-center space-x-2">
					<Switch
						id="Show Bounding Box Text"
						checked={showText}
						onCheckedChange={handleToggleText}
					/>
					<Label htmlFor="Show-Bounding-Box-Text">Show Bounding Box Text</Label>
				</div>
			</div>
			{menuSrc && (
				<ImageResults
					menuSrc={menuSrc}
					data={data}
					imageRef={imageRef}
					showText={showText}
					imageResultsRef={imageResultsRef}
				/>
			)}
		</div>
	);
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

export default App;
