import { useEffect, useState } from "react";

interface ResponsiveState {
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
}

export const useResponsive = (): ResponsiveState => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});

	useEffect(() => {
		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	return {
		isMobile: windowSize.width < 768,
		isTablet: windowSize.width >= 768 && windowSize.width < 1024,
		isDesktop: windowSize.width >= 1024,
	};
};

export default useResponsive;
