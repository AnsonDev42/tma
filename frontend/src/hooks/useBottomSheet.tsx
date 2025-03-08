import React, { useState, useRef, useEffect } from "react";

export interface BottomSheetState {
	isOpen: boolean;
	height: string;
	bottomSheetRef: React.RefObject<HTMLDivElement | null>;
	toggleBottomSheet: () => void;
	openBottomSheet: () => void;
	closeBottomSheet: () => void;
	handleBottomSheetDrag: () => void;
	setBottomSheetHeight: (height: string) => void;
	scrollToDish: (dishId?: number) => void;
}

// Hook for individual component use
export const useBottomSheet = (
	initialHeight: string = "30vh",
	initialState: boolean = false,
	autoOpenOnMount: boolean = false,
): BottomSheetState => {
	const [isOpen, setIsOpen] = useState(initialState);
	const [height, setHeight] = useState(initialHeight);
	const bottomSheetRef = useRef<HTMLDivElement>(null);

	// Auto-open on mount if specified
	useEffect(() => {
		if (autoOpenOnMount) {
			setIsOpen(true);
		}
	}, [autoOpenOnMount]);

	// Toggle bottom sheet open/closed
	const toggleBottomSheet = () => {
		setIsOpen((prev) => !prev);
	};

	// Explicitly open bottom sheet
	const openBottomSheet = () => {
		setIsOpen(true);
	};

	// Explicitly close bottom sheet
	const closeBottomSheet = () => {
		setIsOpen(false);
	};

	// Set bottom sheet height directly
	const setBottomSheetHeight = (newHeight: string) => {
		setHeight(newHeight);
	};

	// Simplified drag handler - no longer needs parameters
	const handleBottomSheetDrag = () => {
		// This function is kept for API compatibility but doesn't do anything
		// since we're using the toggle button instead of drag gestures
		return;
	};

	// Function to scroll to a specific dish in the bottom sheet
	const scrollToDish = (dishId?: number) => {
		// First make sure the bottom sheet is open
		if (!isOpen) {
			openBottomSheet();
		}

		// Dispatch a custom event to trigger scrolling in the DishCardGrid component
		if (dishId) {
			console.log(`Dispatching scroll event for dish ${dishId}`);
			const scrollEvent = new CustomEvent("scrollToDish", {
				detail: { dishId },
			});
			window.dispatchEvent(scrollEvent);
		}
	};

	return {
		isOpen,
		height,
		bottomSheetRef,
		toggleBottomSheet,
		openBottomSheet,
		closeBottomSheet,
		handleBottomSheetDrag,
		setBottomSheetHeight,
		scrollToDish,
	};
};

/**
 * useBottomSheet Hook
 *
 * A custom hook for managing bottom sheet state and behavior.
 * This hook provides functionality for opening, closing, and controlling
 * the height of a bottom sheet component.
 *
 * @param initialHeight - The initial height of the bottom sheet (default: "30vh")
 * @param initialState - Whether the bottom sheet should be initially open (default: false)
 * @param autoOpenOnMount - Whether to automatically open the bottom sheet when mounted (default: false)
 * @returns BottomSheetState object with state and methods for controlling the bottom sheet
 */

export default useBottomSheet;
