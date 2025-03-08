import DesktopContent from "@/components/features/MenuV2/DesktopContent.tsx";
import MobileContent from "@/components/features/MenuV2/MobileContent.tsx";
import OrderPanel from "@/components/features/MenuV2/OrderPanel";
import HeaderV2 from "@/components/layout/HeaderV2.tsx";
import MainLayout from "@/components/layout/MainLayout";
import { BottomSheetProvider } from "@/contexts/BottomSheetContext";
import { MenuV2Provider } from "@/contexts/MenuV2Context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useState } from "react";

export default function HomePageV2() {
	const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
	const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);

	// Use the responsive hook instead of managing state manually
	const { isMobile } = useResponsive();

	// Toggle upload form
	const toggleUploadForm = () => {
		setIsUploadFormOpen(!isUploadFormOpen);
	};

	return (
		<ThemeProvider>
			<MenuV2Provider>
				<BottomSheetProvider initialHeight="30vh">
					<MainLayout
						customHeader={
							<HeaderV2
								isOrderPanelOpen={isOrderPanelOpen}
								onOrderPanelToggle={() =>
									setIsOrderPanelOpen(!isOrderPanelOpen)
								}
							/>
						}
					>
						{/* Main Content - Desktop View */}
						{!isMobile && <DesktopContent />}

						{/* Main Content - Mobile View */}
						{isMobile && (
							<MobileContent
								isUploadFormOpen={isUploadFormOpen}
								toggleUploadForm={toggleUploadForm}
							/>
						)}

						{/* Order Panel Slide-in */}
						<OrderPanel
							isOpen={isOrderPanelOpen}
							onClose={() => setIsOrderPanelOpen(false)}
						/>
					</MainLayout>
				</BottomSheetProvider>
			</MenuV2Provider>
		</ThemeProvider>
	);
}
