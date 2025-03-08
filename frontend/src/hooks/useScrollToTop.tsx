import { useCallback, useEffect, useState } from "react";

interface ScrollToTopState {
	showScrollToTop: boolean;
	scrollToTop: () => void;
}

export const useScrollToTop = (threshold: number = 200): ScrollToTopState => {
	const [showScrollToTop, setShowScrollToTop] = useState(false);

	// Function to scroll to top
	const scrollToTop = useCallback(() => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	}, []);

	// Listen for scroll events to show/hide the button
	useEffect(() => {
		const handleScroll = () => {
			setShowScrollToTop(window.scrollY > threshold);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [threshold]);

	return {
		showScrollToTop,
		scrollToTop,
	};
};

export default useScrollToTop;
