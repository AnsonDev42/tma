import supabase from "@/lib/supabaseClient.ts";
import { Session } from "inspector";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoginForm } from "./LoginForm";
import { UserWelcomeBanner } from "./UserWelcomeBanner";
export function Authentication() {
	const [session, setSession] = useState<Session | null>(null);
	const navigate = useNavigate();
	const loginFormRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const {
			data: { subscription },
			// 	workaround for build error
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} = supabase.auth.onAuthStateChange((event: any, session: any) => {
			setSession(session);
			if (event === "SIGNED_IN") {
				navigate("/home", { replace: true });
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		// workaround for build error
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		supabase.auth.onAuthStateChange(async (event: any, _auth: any) => {
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

	const handleGetStarted = () => {
		loginFormRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<div>
			<div className="hero bg-base-200 min-h-screen">
				<div className="hero-content flex-col lg:flex-row-reverse">
					<img
						src="public/tma-icon.jpeg"
						className="max-w-sm rounded-lg shadow-2xl"
						alt="Hero image"
					/>
					<div>
						<h1 className="text-5xl font-bold">Welcome to The Menu App!</h1>
						<p className="py-6">
							Discover and explore menus from various restaurants. Get
							AI-powered recommendations and manage your favorite dishes.
						</p>
						<button className="btn btn-primary" onClick={handleGetStarted}>
							Get Started
						</button>
					</div>
				</div>
			</div>
			<div ref={loginFormRef}>
				{!session ? <LoginForm /> : <UserWelcomeBanner />}
			</div>
		</div>
	);
}
