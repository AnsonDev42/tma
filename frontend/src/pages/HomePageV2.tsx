import DishCardGrid from "@/components/features/MenuV2/DishCardGrid";
import ImageViewer from "@/components/features/MenuV2/ImageViewer";
import LanguageToggle from "@/components/features/MenuV2/LanguageToggle";
import OrderPanel from "@/components/features/MenuV2/OrderPanel";
import UploadFormV2 from "@/components/features/MenuV2/UploadFormV2";
import { MenuV2Provider, useMenuV2 } from "@/contexts/MenuV2Context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePageV2() {
	const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
	const [theme, setTheme] = useState("light");
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
	const [bottomSheetHeight, setBottomSheetHeight] = useState("30vh");
	const [isMobile, setIsMobile] = useState(false);
	const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
	const bottomSheetRef = useRef<HTMLDivElement>(null);

	// Apply theme to body
	useEffect(() => {
		document.body.className =
			theme === "dark" ? "bg-slate-900" : "bg-slate-100";
	}, [theme]);

	// Check if device is mobile
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);

		return () => {
			window.removeEventListener("resize", checkIfMobile);
		};
	}, []);

	// Toggle bottom sheet
	const toggleBottomSheet = () => {
		setIsBottomSheetOpen(!isBottomSheetOpen);
	};

	// Handle bottom sheet drag
	const handleBottomSheetDrag = (e: React.TouchEvent<HTMLDivElement>) => {
		if (!bottomSheetRef.current) return;

		const touchY = e.touches[0].clientY;
		const windowHeight = window.innerHeight;
		const newHeight = Math.max(
			30,
			Math.min(80, ((windowHeight - touchY) / windowHeight) * 100),
		);

		setBottomSheetHeight(`${newHeight}vh`);
	};

	// Toggle upload form
	const toggleUploadForm = () => {
		setIsUploadFormOpen(!isUploadFormOpen);
	};

	return (
		<MenuV2Provider>
			{/* Now we can safely use the useMenuV2 hook inside the provider */}
			<AppContent
				theme={theme}
				isMobile={isMobile}
				isUploadFormOpen={isUploadFormOpen}
				toggleUploadForm={toggleUploadForm}
				bottomSheetRef={bottomSheetRef}
				isBottomSheetOpen={isBottomSheetOpen}
				bottomSheetHeight={bottomSheetHeight}
				handleBottomSheetDrag={handleBottomSheetDrag}
				toggleBottomSheet={toggleBottomSheet}
				setIsOrderPanelOpen={setIsOrderPanelOpen}
				isOrderPanelOpen={isOrderPanelOpen}
				setTheme={setTheme}
			/>
		</MenuV2Provider>
	);
}

// Separate component to use the MenuV2 context safely
interface AppContentProps {
	theme: string;
	isMobile: boolean;
	isUploadFormOpen: boolean;
	toggleUploadForm: () => void;
	bottomSheetRef: React.RefObject<HTMLDivElement | null>;
	isBottomSheetOpen: boolean;
	bottomSheetHeight: string;
	handleBottomSheetDrag: (e: React.TouchEvent<HTMLDivElement>) => void;
	toggleBottomSheet: () => void;
	setIsOrderPanelOpen: (isOpen: boolean) => void;
	isOrderPanelOpen: boolean;
	setTheme: (value: React.SetStateAction<string>) => void;
}

function AppContent({
	theme,
	isMobile,
	isUploadFormOpen,
	toggleUploadForm,
	bottomSheetRef,
	isBottomSheetOpen,
	bottomSheetHeight,
	handleBottomSheetDrag,
	toggleBottomSheet,
	setIsOrderPanelOpen,
	isOrderPanelOpen,
	setTheme,
}: AppContentProps) {
	// State for showing/hiding the scroll to top button
	const [showScrollToTop, setShowScrollToTop] = useState(false);

	// Function to scroll to top
	const scrollToTop = useCallback(() => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	}, []);

	// Listen for scroll events to show/hide the button
	useEffect(() => {
		if (!isMobile) return;

		const handleScroll = () => {
			setShowScrollToTop(window.scrollY > 200);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isMobile]);
	// Now we can safely use the useMenuV2 hook inside the provider
	const { selectedImage } = useMenuV2();
	const navigate = useNavigate();

	return (
		<div
			className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"} ${isMobile ? "overflow-hidden" : ""}`}
		>
			{/* Header with Neumorphism style */}
			<header
				className={`fixed top-0 left-0 right-0 z-50 ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"} shadow-lg`}
			>
				<div className="container mx-auto px-4 py-3 flex justify-between items-center">
					<div className="flex items-center">
						<h1
							className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}
						>
							TMA <span className="text-blue-500">v2</span>
						</h1>
					</div>

					<div className="flex items-center space-x-4">
						<LanguageToggle />

						{/* Theme Toggle */}
						<button
							onClick={() =>
								setTheme((prevTheme) =>
									typeof prevTheme === "string"
										? prevTheme === "light"
											? "dark"
											: "light"
										: "light",
								)
							}
							className={`p-2 rounded-full ${
								theme === "dark"
									? "bg-slate-700 text-yellow-300 shadow-inner"
									: "bg-slate-300 text-slate-700 shadow"
							}`}
						>
							{theme === "dark" ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
									/>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
									/>
								</svg>
							)}
						</button>

						{/* Order Panel Toggle */}
						<button
							onClick={() => setIsOrderPanelOpen(!isOrderPanelOpen)}
							className={`p-2 rounded-full relative ${
								theme === "dark"
									? "bg-slate-700 text-blue-400 shadow-inner"
									: "bg-slate-300 text-blue-600 shadow"
							}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</button>

						{/* Back to V1 Button */}
						<button
							onClick={() => navigate("/home")}
							className={`px-3 py-1 rounded-md ${
								theme === "dark"
									? "bg-slate-700 text-white shadow-inner"
									: "bg-slate-300 text-slate-700 shadow"
							}`}
						>
							Back to V1
						</button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			{/* Main Content - Desktop View */}
			{!isMobile && (
				<main className="container mx-auto pt-20 pb-10 px-4">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Left Column - Upload Form */}
						<div
							className={`lg:col-span-3 ${
								theme === "dark"
									? "bg-slate-800 shadow-lg"
									: "bg-white shadow-xl"
							} rounded-xl p-6 mb-6`}
						>
							<UploadFormV2 theme={theme} />
						</div>

						{/* Left Column - Image Viewer */}
						<div
							className={`lg:col-span-2 ${
								theme === "dark"
									? "bg-slate-800 shadow-lg"
									: "bg-white shadow-xl"
							} rounded-xl p-6`}
						>
							<ImageViewer theme={theme} />
						</div>

						{/* Right Column - Dish Grid */}
						<div
							className={`${
								theme === "dark"
									? "bg-slate-800 shadow-lg"
									: "bg-white shadow-xl"
							} rounded-xl p-6`}
						>
							<DishCardGrid theme={theme} />
						</div>
					</div>
				</main>
			)}

			{/* Main Content - Mobile View */}
			{isMobile && (
				<main className="pt-16 h-screen">
					{/* Full Screen Image Viewer */}
					<div className="h-full w-full">
						<ImageViewer theme={theme} isMobile={true} />
					</div>

					{/* Upload Form Overlay */}
					{isUploadFormOpen && (
						<div
							className={`fixed inset-0 z-40 ${theme === "dark" ? "bg-slate-900" : "bg-slate-100"} p-4 pt-20 overflow-y-auto`}
						>
							<button
								onClick={toggleUploadForm}
								className="absolute top-20 right-4 p-2 rounded-full bg-slate-300 text-slate-700"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
							<div className="mt-4">
								<UploadFormV2 theme={theme} />
							</div>
						</div>
					)}

					{/* Upload Button (Only shown when no image is selected) */}
					{!selectedImage && !isUploadFormOpen && (
						<div className="fixed inset-0 flex items-center justify-center z-30">
							<button
								onClick={toggleUploadForm}
								className={`px-6 py-3 rounded-lg font-medium text-lg shadow-lg
										${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}
							>
								Upload Menu
							</button>
						</div>
					)}

					{/* Bottom Sheet for Dish Cards */}
					{selectedImage && (
						<div
							ref={bottomSheetRef}
							className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out
									${isBottomSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-120px)]"}
									${theme === "dark" ? "bg-slate-800" : "bg-white"} rounded-t-xl shadow-lg`}
							style={{ height: bottomSheetHeight }}
						>
							{/* Drag Handle */}
							<div
								className="w-full flex justify-center py-2 cursor-grab active:cursor-grabbing"
								onClick={toggleBottomSheet}
								onTouchMove={handleBottomSheetDrag}
							>
								<div
									className={`w-10 h-1 rounded-full ${theme === "dark" ? "bg-slate-600" : "bg-slate-300"}`}
								></div>
							</div>

							{/* Dish Cards */}
							<div className="p-4 h-[calc(100%-40px)] overflow-hidden">
								<DishCardGrid theme={theme} isMobile={true} />
							</div>
						</div>
					)}

					{/* Mobile Upload Button */}
					{selectedImage && !isUploadFormOpen && (
						<button
							onClick={toggleUploadForm}
							className={`fixed bottom-[130px] right-4 z-40 p-3 rounded-full shadow-lg
									${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
						</button>
					)}

					{/* Scroll to Top Button - Always visible on mobile when image is selected */}
					{isMobile && selectedImage && (
						<button
							onClick={scrollToTop}
							className={`fixed bottom-[130px] left-4 z-40 p-3 rounded-full shadow-lg
									${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}
									transition-opacity duration-300 ${showScrollToTop ? "opacity-100" : "opacity-0"}`}
							aria-label="Scroll to top"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 10l7-7m0 0l7 7m-7-7v18"
								/>
							</svg>
						</button>
					)}
				</main>
			)}

			{/* Order Panel Slide-in */}
			<OrderPanel
				isOpen={isOrderPanelOpen}
				onClose={() => setIsOrderPanelOpen(false)}
				theme={theme}
			/>
		</div>
	);
}
