import LandingPageHero from "@/components/ui/LandingPageHero";
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
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const {
			data: { subscription },
			// 	workaround for build error
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} = supabase.auth.onAuthStateChange((event: any, session: any) => {
			setSession(session);
			setIsLoading(false);
			if (event === "SIGNED_IN") {
				navigate("/home", { replace: true });
			}
		});

		// Initial session check
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		// @ts-ignore
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setIsLoading(false);
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
	if (isLoading) {
		return <div>Loading...</div>; // Or a loading spinner component
	}

	if (session) {
		return <UserWelcomeBanner />;
	}
	return (
		<div>
			<LandingPageHero handleGetStarted={handleGetStarted} />
			<div ref={loginFormRef}>{<LoginForm />}</div>
		</div>
	);
}
