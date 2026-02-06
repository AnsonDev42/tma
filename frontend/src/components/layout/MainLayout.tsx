import Header from "@/components/layout/Header";
import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import React, { ReactNode } from "react";

interface MainLayoutProps {
	children: ReactNode;
	title?: string;
	customHeader?: ReactNode;
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
				isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
			}`}
		>
			{customHeader ? customHeader : <Header title={title} />}
			<div className={isMobile ? "pb-28" : "pb-12"}>{children}</div>
		</div>
	);
};

export default MainLayout;
