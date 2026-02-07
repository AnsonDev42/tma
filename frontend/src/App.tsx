import "./globals.css";
import Footer from "@/components/ui/Footer.tsx";
import { UserInfoProvider } from "@/contexts/UserInfoContext.tsx";
import BenchmarkDebugPage from "@/pages/BenchmarkDebugPage.tsx";
import HomePageV2 from "@/pages/HomePageV2.tsx";
import {
	Navigate,
	Route,
	BrowserRouter as Router,
	Routes,
} from "react-router-dom";
import { Toaster } from "sonner";

function App() {
	const isDebugToolsEnabled = import.meta.env.VITE_DEBUG_TOOLS === "true";

	return (
		<UserInfoProvider>
			<Toaster position="top-center" richColors />
			<div className="min-h-screen">
				<Router>
					<Routes>
						<Route path="/home" element={<HomePageV2 />} />
						<Route
							path="/debug/benchmark"
							element={
								isDebugToolsEnabled ? (
									<BenchmarkDebugPage />
								) : (
									<Navigate to="/home" replace />
								)
							}
						/>
						<Route path="/login" element={<Navigate to="/home" replace />} />
						<Route path="*" element={<Navigate to="/home" replace />} />
					</Routes>
				</Router>
				<Footer />
			</div>
		</UserInfoProvider>
	);
}

export default App;
