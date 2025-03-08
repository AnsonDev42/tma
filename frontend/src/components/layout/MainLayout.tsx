import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import React, { ReactNode } from "react";
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

	return (
		<div
			className={`min-h-screen transition-colors duration-300 ${
				isDark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
			} ${isMobile ? "overflow-hidden" : ""}`}
		>
			{customHeader ? customHeader : <Header title={title} />}

			<main className="pt-16 pb-20">{children}</main>
		</div>
	);
};

export default MainLayout;
