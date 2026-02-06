import "./globals.css";
import { Authentication } from "@/components/features/Authentication/Authentication.tsx";
import Footer from "@/components/ui/Footer.tsx";
import { UserInfoProvider } from "@/contexts/UserInfoContext.tsx";
import HomePageV2 from "@/pages/HomePageV2.tsx";
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
		<UserInfoProvider>
			<Toaster position="top-center" richColors />
			<div className="min-h-screen">
				<Router>
					<Routes>
						<Route element={<ProtectedRoute />}>
							<Route path="/home" element={<HomePageV2 />} />
							<Route path="*" element={<Navigate to="/home" />} />
						</Route>
						<Route path="/login" element={<Authentication />} />
					</Routes>
				</Router>
				<Footer />
			</div>
		</UserInfoProvider>
	);
}

export default App;
