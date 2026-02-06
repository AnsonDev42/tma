import LandingPageHero from "@/components/ui/LandingPageHero";
import supabase from "@/lib/supabaseClient.ts";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
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
		} = supabase.auth.onAuthStateChange(
			async (event: AuthChangeEvent, nextSession: Session | null) => {
				setSession(nextSession);
				setIsLoading(false);

				if (event === "SIGNED_IN") {
					navigate("/home", { replace: true });
				}

				if (event === "PASSWORD_RECOVERY") {
					const newPassword = prompt("Enter your new password");
					if (!newPassword) {
						return;
					}

					const { error } = await supabase.auth.updateUser({
						password: newPassword,
					});

					if (error) {
						alert("There was an error updating your password.");
						return;
					}

					toast.info("Password updated successfully!");
				}
			},
		);

		void supabase.auth
			.getSession()
			.then(({ data }) => {
				setSession(data.session);
				setIsLoading(false);
			})
			.catch(() => {
				setIsLoading(false);
			});

		return () => subscription.unsubscribe();
	}, [navigate]);

	const handleGetStarted = () => {
		loginFormRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (session) {
		return <UserWelcomeBanner />;
	}

	return (
		<div>
			<LandingPageHero handleGetStarted={handleGetStarted} />
			<div ref={loginFormRef}>
				<LoginForm />
			</div>
		</div>
	);
}
