import { SessionContext } from "@/contexts/SessionContext.tsx";
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
	const session = useContext(SessionContext)?.session;
	const isE2EAuthBypassEnabled =
		import.meta.env.VITE_E2E_AUTH_BYPASS === "true";
	if (isE2EAuthBypassEnabled) {
		return <Outlet />;
	}
	if (session) {
		return <Outlet />;
	}
	return <Navigate to="/login" />;
};
