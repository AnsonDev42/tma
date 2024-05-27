import "./globals.css";
import { Authentication } from "@/components/Authentication.tsx";
import { ImageResults } from "@/components/Dish.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import Sidebar from "@/components/Sidebar.tsx";
import UploadForm from "@/components/UploadForm.tsx";
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
	const [imgTimestamp, setImgTimestamp] = useState<string | null>(null);
	const imageRef = useRef(null);
	const imageResultsRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (imageResultsRef.current) {
			imageResultsRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [showText, data, imageRef]);

	useEffect(() => {
		if (imgTimestamp) {
			setImgTimestamp(imgTimestamp);
		}
	}, [data]);

	const handleToggleText = () => {
		setShowText((prevShowText) => !prevShowText);
	};
	const handleSelectUpload = (imageSrc: string, data: DishProps[]) => {
		setMenuSrc(imageSrc);
		setData(data);
	};

	return (
		<div data-theme="">
			<div className="drawer lg:drawer-open">
				<input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
				<div className="drawer-content flex flex-col">
					<div className="fixed top-0 left-0 right-0 z-50">
						<Navbar />
					</div>
					{/*	content */}
					<div className="flex flex-col mx-2">
						{/* authentication */}
						<Authentication />
						<div className="divider divider-neutral"></div>

						{/* upload form */}
						<div className="max-w-lg">
							<UploadForm
								onUploadComplete={setData}
								setMenuSrc={setMenuSrc}
								setImgTimestamp={setImgTimestamp}
							/>
							<div className="w-full"></div>
						</div>
						<div
							className="divider divider-neutral"
							ref={imageResultsRef}
						></div>
						{/* bounding box toggle*/}
						<div className="mt-4">
							<div> {imgTimestamp}</div>

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
								timeStamp={imgTimestamp as string}
							/>
						)}
					</div>
				</div>
				<div className="drawer-side">
					<label
						htmlFor="my-drawer-3"
						aria-label="close sidebar"
						className="drawer-overlay"
					></label>
					<Sidebar onSelectUpload={handleSelectUpload} />
				</div>
			</div>
		</div>
	);
}

export default App;
