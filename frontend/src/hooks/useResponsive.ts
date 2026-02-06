import { useEffect, useState } from "react";

interface ResponsiveState {
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
}

function getResponsiveState(): ResponsiveState {
	if (typeof window === "undefined") {
		return { isMobile: false, isTablet: false, isDesktop: true };
	}

	const width = window.innerWidth;
	return {
		isMobile: width < 768,
		isTablet: width >= 768 && width < 1024,
		isDesktop: width >= 1024,
	};
}

export const useResponsive = (): ResponsiveState => {
	const [state, setState] = useState<ResponsiveState>(() =>
		getResponsiveState(),
	);

	useEffect(() => {
		const handleResize = () => {
			setState(getResponsiveState());
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	return state;
};
