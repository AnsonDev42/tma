import "./globals.css";
import { ImageResults } from "@/components/Dish.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import UploadForm from "@/components/UploadForm.tsx";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SessionProvider } from "@/contexts/SessionContext";
import { DishProps } from "@/types/DishProps.tsx";
import { Turnstile } from "@marsidev/react-turnstile";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Session } from "@supabase/gotrue-js/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "./components/ui/button";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd29kaGVoenRlbXpjcHNvZnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMjA3MTksImV4cCI6MjAzMDY5NjcxOX0.j4O3aKoITFoJi36sQiPoh5PUWSDwwDDh02hhmMRF8HY",
);

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
	return (
		<div>
			<Toaster position="top-center" richColors />
			<SessionProvider>
				<MainAppContent />
			</SessionProvider>
		</div>
	);
}
function MainAppContent() {
	const [showText, setShowText] = useState(true); // show bounding box text
	const [menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [data, setData] = useState([] as DishProps[]);
	const imageRef = useRef(null);
	const imageResultsRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (imageResultsRef.current) {
			imageResultsRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [menuSrc, showText, data]);

	const handleToggleText = () => {
		setShowText((prevShowText) => !prevShowText);
	};

	return (
		<div data-theme="">
			<Navbar />
			<Authentication />
			<div className="max-w-lg">
				<UploadForm onUploadComplete={setData} setMenuSrc={setMenuSrc} />
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

export default App;
