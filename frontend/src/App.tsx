import "./globals.css";
import { ImageResults } from "@/components/Dish.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import UploadForm from "@/components/UploadForm.tsx";

import { Authentication } from "@/components/Authentication.tsx";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SessionProvider } from "@/contexts/SessionContext";
import { DishProps } from "@/types/DishProps.tsx";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";

function App() {
	return (
		<div>
			<Toaster position="top-center" richColors />
			<SessionProvider>
				<MainAppContent />
			</SessionProvider>
		</div>
	);
}
function MainAppContent() {
	const [showText, setShowText] = useState(true); // show bounding box text
	const [menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [data, setData] = useState([] as DishProps[]);
	const imageRef = useRef(null);
	const imageResultsRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (imageResultsRef.current) {
			imageResultsRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [menuSrc, showText, data]);

	const handleToggleText = () => {
		setShowText((prevShowText) => !prevShowText);
	};

	return (
		<div data-theme="">
			<Navbar />
			<Authentication />
			<div className="max-w-lg">
				<UploadForm onUploadComplete={setData} setMenuSrc={setMenuSrc} />
				<div className="w-full"></div>
			</div>
			{/* Toggle for showing/hiding text */}
			<div className="mt-4">
				<div className="flex items-center space-x-2">
					<Switch
						id="Show Bounding Box Text"
						checked={showText}
						onCheckedChange={handleToggleText}
					/>
					<Label htmlFor="Show-Bounding-Box-Text">Show Bounding Box Text</Label>
				</div>
			</div>

			{menuSrc && (
				<ImageResults
					menuSrc={menuSrc}
					data={data}
					imageRef={imageRef}
					showText={showText}
					imageResultsRef={imageResultsRef}
				/>
			)}
		</div>
	);
}

export default App;
