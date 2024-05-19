import { AuthChangeEvent, Session } from "@supabase/gotrue-js";
import { createClient } from "@supabase/supabase-js";
import { ReactNode, createContext, useEffect, useState } from "react";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd29kaGVoenRlbXpjcHNvZnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMjA3MTksImV4cCI6MjAzMDY5NjcxOX0.j4O3aKoITFoJi36sQiPoh5PUWSDwwDDh02hhmMRF8HY",
);

interface SessionContextProps {
	session: Session | null;
	setSession: (session: Session | null) => void;
}

export const SessionContext = createContext<SessionContextProps | undefined>(
	undefined,
);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			(_event: AuthChangeEvent, session: Session | null) => {
				setSession(session);
				setLoading(false);
			},
		);

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
		<SessionContext.Provider value={{ session, setSession }}>
			{children}
		</SessionContext.Provider>
	);
};
