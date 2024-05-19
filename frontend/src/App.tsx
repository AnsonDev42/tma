import "./globals.css";
import { ImageResults } from "@/components/Dish.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import UploadForm from "@/components/UploadForm.tsx";

import { Authentication } from "@/components/Authentication.tsx";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SessionContext, SessionProvider } from "@/contexts/SessionContext";
import { DishProps } from "@/types/DishProps.tsx";
import { useContext, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";

function App() {
	const session = useContext(SessionContext)?.session;
	return (
		<div>
			<Toaster position="top-center" richColors />
			<SessionProvider>
				{session ? <MainAppContent /> : <Authentication />}
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
			<div className="flex flex-col mx-2">
				{/* authentication */}
				<Authentication />
				<div className="divider divider-neutral"></div>

				{/* upload form */}
				<div className="max-w-lg">
					<UploadForm onUploadComplete={setData} setMenuSrc={setMenuSrc} />
					<div className="w-full"></div>
				</div>
				<div className="divider divider-neutral" ref={imageResultsRef}></div>

				{/* bounding box toggle*/}
				<div className="mt-4">
					<div className="flex items-center space-x-2">
						<Switch
							id="Show Bounding Box Text"
							checked={showText}
							onCheckedChange={handleToggleText}
						/>
						<Label htmlFor="Show-Bounding-Box-Text">
							Show Bounding Box Text
						</Label>
					</div>
				</div>

				{/* image results */}
				{menuSrc && (
					<ImageResults
						menuSrc={menuSrc}
						data={data}
						imageRef={imageRef}
						showText={showText}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
