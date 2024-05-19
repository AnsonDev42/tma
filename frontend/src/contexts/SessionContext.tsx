import { AuthChangeEvent, Session } from "@supabase/gotrue-js";
import { createClient } from "@supabase/supabase-js";
import React, { createContext, useEffect, useState, ReactNode } from "react";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"REMOVED",
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
