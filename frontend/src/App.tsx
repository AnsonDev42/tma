import "./globals.css";
import { Authentication } from "@/components/features/Authentication/Authentication.tsx";
import Footer from "@/components/ui/Footer.tsx";
import { SessionProvider } from "@/contexts/SessionContext";
import { HomePage } from "@/pages/HomePage.tsx";
import { ProtectedRoute } from "@/routers/router.tsx";
import {
	Navigate,
	Route,
	BrowserRouter as Router,
	Routes,
} from "react-router-dom";
import { Toaster } from "sonner";

function App() {
	return (
		<div>
			<Toaster position="top-center" richColors />
			<SessionProvider>
				<div data-theme="">
					<Router>
						<Routes>
							<Route element={<ProtectedRoute />}>
								<Route path="/home" element={<HomePage />} />
								<Route path="*" element={<Navigate to="/home" />} />
							</Route>
							<Route path="/login" element={<Authentication />} />
						</Routes>
					</Router>
					<div className="mt-4">
						<Footer />
					</div>
				</div>
			</SessionProvider>
		</div>
	);
}

export default App;
