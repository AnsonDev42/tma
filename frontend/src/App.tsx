import "./globals.css";
import Footer from "@/components/ui/Footer.tsx";
import { UserInfoProvider } from "@/contexts/UserInfoContext.tsx";
import HomePageV2 from "@/pages/HomePageV2.tsx";
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
						<Route path="/home" element={<HomePageV2 />} />
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
