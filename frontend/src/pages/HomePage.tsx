import { AIRecommendationButton } from "@/components/features/AIRecommendations/AIRecommendationButton.tsx";
import { Authentication } from "@/components/features/Authentication/Authentication.tsx";
import { BBoxSettings } from "@/components/features/Menu/BBoxSettings";
import { BBoxTextToggle } from "@/components/features/Menu/BBoxTextToggle.tsx";
import ImageCarousel from "@/components/features/Menu/ImageCarousel.tsx";
import UploadForm from "@/components/features/Menu/UploadForm.tsx";
import { Navbar } from "@/components/ui/Navbar.tsx";
import Sidebar from "@/components/ui/Sidebar.tsx";
import { useMenuState } from "@/utils/hooks/useMenuState.ts";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
export function HomePage() {
	const {
		showTextState,
		data,
		imgTimestamp,
		handleToggleTextState,
		handleSelectUpload,
		opacity,
		setOpacity,
		textColor,
		setTextColor,
	} = useMenuState();

	const imageResultsRef = useRef<HTMLDivElement | null>(null);

	const navigate = useNavigate();

	const goToV2 = () => {
		navigate("/home");
	};

	return (
		<div className="drawer lg:drawer-open">
			<input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content flex flex-col">
				<div className="fixed top-0 left-0 right-0 z-50">
					<Navbar />
				</div>
				<button
					onClick={goToV2}
					className="version-toggle"
					style={{
						position: "fixed",
						top: "10px",
						right: "10px",
						zIndex: 1000,
						padding: "5px 10px",
						background: "#4a4a4a",
						color: "white",
						borderRadius: "4px",
						cursor: "pointer",
					}}
				>
					Try V2 UI
				</button>
				<div className="flex flex-col mx-2">
					<div className="divider divider-neutral"></div>
					<Authentication />
					<div className="divider divider-neutral"></div>
					<div className="max-w-lg">
						<UploadForm onSelectUpload={handleSelectUpload} />
					</div>
					<div className="divider divider-neutral"></div>
					<div className="mb-4 w-full max-w-md">
						<AIRecommendationButton
							dishes={data.map((dish) => dish.info.text)}
						/>
					</div>
					<div className="divider divider-neutral" ref={imageResultsRef}></div>
					<div className="flex flex-col ml-2 gap-4 justify-center content-center">
						<div className="collapse bg-base-200  max-w-lg">
							<input type="checkbox" />
							<div className="collapse-title text-l font-medium">
								Text/Background Settings
							</div>
							<div className="collapse-content">
								<BBoxSettings
									opacity={opacity}
									setOpacity={setOpacity}
									textColor={textColor}
									setTextColor={setTextColor}
								/>
							</div>
						</div>
						<BBoxTextToggle
							showTextState={showTextState}
							onToggle={handleToggleTextState}
						/>
					</div>
					<ImageCarousel
						showTextState={showTextState}
						handleSelectUpload={handleSelectUpload}
						imgTimestamp={imgTimestamp}
						opacity={opacity}
						textColor={textColor}
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
		</div>
	);
}
