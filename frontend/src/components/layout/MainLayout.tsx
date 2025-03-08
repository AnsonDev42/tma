import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import React, { ReactNode, useState, useEffect } from "react";
import Header from "./Header";

interface MainLayoutProps {
	children: ReactNode;
	title?: string;
	customHeader?: ReactNode; // Added customHeader prop to allow custom header components
}

const MainLayout: React.FC<MainLayoutProps> = ({
	children,
	title,
	customHeader,
}) => {
	const { isDark } = useTheme();
	const { isMobile } = useResponsive();
	const [showScrollToTop, setShowScrollToTop] = useState(false);

	// Function to scroll to top
	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	// Listen for scroll events to show/hide the button
	useEffect(() => {
		if (!isMobile) return;

		const handleScroll = () => {
			setShowScrollToTop(window.scrollY > 200);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isMobile]);

	return (
		<div
			className={`min-h-screen transition-colors duration-300 ${
				isDark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
			} ${isMobile ? "overflow-hidden" : ""}`}
		>
			{customHeader ? customHeader : <Header title={title} />}

			<main className="pt-16 pb-20">{children}</main>

			<ScrollToTopButton visible={showScrollToTop} onClick={scrollToTop} />
		</div>
	);
};

export default MainLayout;
