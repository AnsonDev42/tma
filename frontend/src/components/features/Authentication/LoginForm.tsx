import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext.tsx";
import supabase from "@/lib/supabaseClient.ts";
import { Turnstile } from "@marsidev/react-turnstile";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function LoginForm() {
	const [captchaToken, setCaptchaToken] = useState<string>("");
	const navigate = useNavigate();
	const setSession = useSession()?.setSession;

	async function handleAnonymousSignIn() {
		try {
			const {
				data: { session },
				error,
			} = await supabase.auth.signInAnonymously({ options: { captchaToken } });
			if (error) throw error;
			toast.success("Signed in anonymously!");
			setSession(session);
			navigate("/home", { replace: true });
		} catch (_error) {
			console.error("Error signing in anonymously.");
			toast.error("Failed to sign in anonymously.");
		}
	}

	return (
		<div className="hero bg-base-200 min-h-screen">
			<div className="hero-content flex-col lg:flex-row-reverse">
				<div className="text-center lg:text-left">
					<h1 className="text-5xl font-bold">Login now!</h1>
					<p className="py-6">
						You are one step away from accessing <b>The Menu App</b>. Sign in
						now to get started 🚀!
					</p>
					<p>
						You don't need to connect or register by clicking below{" "}
						<b>sign in anonymously</b> for now, or use the Google or GitHub
						sign-in options.
					</p>
				</div>
				<div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
					<div className="card-body">
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
						<h1>
							<b>***Demo Sign in*** : </b>
						</h1>
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
			</div>
		</div>
	);
}
