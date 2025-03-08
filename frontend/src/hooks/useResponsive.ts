import { useEffect, useState } from "react";

interface ResponsiveState {
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
}

export const useResponsive = (): ResponsiveState => {
	const [state, setState] = useState<ResponsiveState>({
		isMobile: false,
		isTablet: false,
		isDesktop: true,
	});

	useEffect(() => {
		const checkScreenSize = () => {
			const width = window.innerWidth;
			setState({
				isMobile: width < 768,
				isTablet: width >= 768 && width < 1024,
				isDesktop: width >= 1024,
			});
		};

		// Initial check
		checkScreenSize();

		// Add event listener
		window.addEventListener("resize", checkScreenSize);

		// Cleanup
		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	return state;
};
