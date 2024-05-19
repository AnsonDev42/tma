import { Button } from "@/components/ui/button.tsx";
import { Turnstile } from "@marsidev/react-turnstile";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Session } from "@supabase/gotrue-js/src/lib/types.ts";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"REMOVED",
);

export function Authentication() {
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
			<div className="flex justify-between items-center gap-2 m-3">
				<div className="flex items-center">
					<h1 className="italic">Welcome, </h1>
					<h1 className="bold ml-1">
						{session.user.email === "" ? "Demo User" : session.user.email}
					</h1>
				</div>
				<div>
					<button
						className="btn btn-link"
						onClick={async () => {
							await supabase.auth.signOut();
							toast.success("Signed out successfully!");
						}}
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}
}
