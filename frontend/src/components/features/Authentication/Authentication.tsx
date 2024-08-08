import { Session } from "@supabase/gotrue-js/src/lib/types.ts";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoginForm } from "./LoginForm.tsx";
import { UserWelcomeBanner } from "./UserWelcomeBanner.tsx";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"REMOVED",
);

export function Authentication() {
	const [session, setSession] = useState<Session | null>(null);
	const navigate = useNavigate();

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

	if (!session) {
		return <LoginForm supabase={supabase} setSession={setSession} />;
	} else {
		return <UserWelcomeBanner session={session} supabase={supabase} />;
	}
}