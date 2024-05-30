import { SessionContext } from "@/contexts/SessionContext.tsx";
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
	const session = useContext(SessionContext)?.session;
	if (!session) {
		return <Navigate to="/login" />;
	}
	return <Outlet />;
};
