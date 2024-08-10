import { AIRecommendationButton } from "@/components/features/AIRecommendations/AIRecommendationButton.tsx";
import { Authentication } from "@/components/features/Authentication/Authentication.tsx";
import { BBoxTextToggle } from "@/components/features/Menu/BBoxTextToggle.tsx";
import ImageCarousel from "@/components/features/Menu/ImageCarousel.tsx";
import UploadForm from "@/components/features/Menu/UploadForm.tsx";
import { Navbar } from "@/components/ui/Navbar.tsx";
import Sidebar from "@/components/ui/Sidebar.tsx";
import { useMenuState } from "@/utils/hooks/useMenuState.ts";
import { useRef } from "react";

export function HomePage() {
	const {
		showTextState,
		data,
		imgTimestamp,
		handleToggleTextState,
		handleSelectUpload,
	} = useMenuState();

	const imageResultsRef = useRef<HTMLDivElement | null>(null);

	return (
		<div className="drawer lg:drawer-open">
			<input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content flex flex-col">
				<div className="fixed top-0 left-0 right-0 z-50">
					<Navbar />
				</div>
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
					<div className="mt-4">
						<BBoxTextToggle
							showTextState={showTextState}
							onToggle={handleToggleTextState}
						/>
					</div>
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
		</div>
	);
}
