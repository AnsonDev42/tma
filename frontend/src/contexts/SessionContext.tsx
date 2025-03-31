import supabase from "@/lib/supabaseClient.ts";
import { AuthChangeEvent } from "@supabase/gotrue-js";
import { Session } from "@supabase/gotrue-js/src/lib/types.ts";
import React, { ReactNode, createContext, useEffect, useState } from "react";

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

		setSession(supabase.auth.getSession());

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

export const useSession = () => {
	const context = React.useContext(SessionContext);
	if (context === undefined) {
		throw new Error("useSession must be used within a SessionProvider");
	}
	return context;
};
