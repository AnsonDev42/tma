import DesktopContent from "@/components/features/MenuV2/DesktopContent.tsx";
import MobileContent from "@/components/features/MenuV2/MobileContent.tsx";
import OrderPanel from "@/components/features/MenuV2/OrderPanel";
import HeaderV2 from "@/components/layout/HeaderV2.tsx";
import MainLayout from "@/components/layout/MainLayout";
import { MenuV2Provider } from "@/contexts/MenuV2Context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useState } from "react";

export default function HomePageV2() {
	const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
	const { isMobile } = useResponsive();

	return (
		<ThemeProvider>
			<MenuV2Provider>
				<MainLayout
					customHeader={
						<HeaderV2
							isOrderPanelOpen={isOrderPanelOpen}
							onOrderPanelToggle={() => setIsOrderPanelOpen(!isOrderPanelOpen)}
						/>
					}
				>
					{isMobile ? <MobileContent /> : <DesktopContent />}
					<OrderPanel
						isOpen={isOrderPanelOpen}
						onClose={() => setIsOrderPanelOpen(false)}
					/>
				</MainLayout>
			</MenuV2Provider>
		</ThemeProvider>
	);
}
