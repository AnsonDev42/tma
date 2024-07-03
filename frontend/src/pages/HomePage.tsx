import { Authentication } from "@/components/features/Authentication/Authentication.tsx";
import ImageCarousel from "@/components/features/Menu/ImageCarousel.tsx";
import { ShowTextState } from "@/components/features/Menu/Menu.tsx";
import UploadForm from "@/components/features/Menu/UploadForm.tsx";
import Footer from "@/components/ui/Footer.tsx";
import { Navbar } from "@/components/ui/Navbar.tsx";
import Sidebar from "@/components/ui/Sidebar.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import { useEffect, useRef, useState } from "react";

export function HomePage() {
	const [showTextState, setShowTextState] = useState(
		ShowTextState.SHOW_ONLY_TRANSLATION,
	);
	const [_menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [_data, setData] = useState([] as DishProps[]);
	const [imgTimestamp, setImgTimestamp] = useState<string | null>(null);
	const imageResultsRef = useRef<HTMLDivElement | null>(null);
	const toggleRef = useRef<HTMLInputElement | null>(null);
	const { uploads } = useUploadsState();

	useEffect(() => {
		if (imageResultsRef.current) {
			imageResultsRef.current.scrollIntoView({ behavior: "smooth" });
		}
		if (uploads.length !== 0) {
			// 	jump to anker of the last upload
			const latestSlide = document.querySelector<HTMLDivElement>(
				`#slide${uploads.length}`,
			)!;
			if (latestSlide) {
				setImgTimestamp(uploads[uploads.length - 1].timestamp);
				latestSlide.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "center",
				});
			}
		}
	}, [uploads]);

	useEffect(() => {
		if (toggleRef.current) {
			if (showTextState == ShowTextState.SHOW_ONLY_TRANSLATION) {
				toggleRef.current.indeterminate = true;
				toggleRef.current.checked = false;
			} else {
				toggleRef.current.indeterminate = false;
				toggleRef.current.checked = showTextState === ShowTextState.SHOW_BOTH;
			}
		}
	}, [showTextState]);

	const handleToggleTextState = () => {
		setShowTextState((prev) => (prev + 1) % 3);
	};

	const handleSelectUpload = (upload: UploadProps) => {
		setData(upload.data);
		setMenuSrc(upload.imageSrc);
		setImgTimestamp(upload.timestamp);
	};

	return (
		<div className="drawer lg:drawer-open">
			<input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content flex flex-col">
				<div className="fixed top-0 left-0 right-0 z-50">
					<Navbar />
				</div>
				{/*	content */}
				<div className="flex flex-col mx-2">
					{/* authentication */}
					<div className="divider divider-neutral"></div>
					<Authentication />
					<div className="divider divider-neutral"></div>
					{/* upload form */}
					<div className="max-w-lg">
						<UploadForm onSelectUpload={handleSelectUpload} />
						<div className="w-full"></div>
					</div>
					<div className="divider divider-neutral" ref={imageResultsRef}></div>
					{/* bounding box toggle*/}
					<div className="mt-4">
						<div> {imgTimestamp}</div>

						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="Show-Bounding-Box-Text"
								className="toggle"
								ref={toggleRef}
								onChange={handleToggleTextState}
							/>
							<label htmlFor="Show-Bounding-Box-Text">
								{showTextState === ShowTextState.HIDE_ALL
									? "Hide all"
									: showTextState === ShowTextState.SHOW_ONLY_TRANSLATION
										? "Show Only Translation"
										: "Show Both Text and Translation"}
							</label>
						</div>
					</div>
					{/* image results */}
					<ImageCarousel
						showTextState={showTextState}
						handleSelectUpload={handleSelectUpload}
						imgTimestamp={imgTimestamp}
					/>
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
			<div className="mt-4">
				<Footer />
			</div>
		</div>
	);
}
