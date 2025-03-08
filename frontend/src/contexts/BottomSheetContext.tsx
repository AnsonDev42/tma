import { BottomSheetState, useBottomSheet } from "@/hooks/useBottomSheet";
import { useResponsive } from "@/hooks/useResponsive";
import React, { createContext, useContext, ReactNode } from "react";
import { useEffect } from "react";
import { useMenuV2 } from "./MenuV2Context";

// Use the BottomSheetState interface from the hook
type BottomSheetContextType = BottomSheetState;

// Create the context
const BottomSheetContext = createContext<BottomSheetContextType | undefined>(
	undefined,
);

// Props for the provider
interface BottomSheetProviderProps {
	children: ReactNode;
	initialHeight?: string;
	initialState?: boolean;
	autoOpenOnMount?: boolean;
}

// Provider component
export const BottomSheetProvider: React.FC<BottomSheetProviderProps> = ({
	children,
	initialHeight = "30vh",
	initialState = false,
	autoOpenOnMount = false,
}) => {
	// Use the bottom sheet hook with all available parameters
	const bottomSheetState = useBottomSheet(
		initialHeight,
		initialState,
		autoOpenOnMount,
	);

	// Get the selected image from MenuV2Context
	const { selectedImage } = useMenuV2();

	// Get responsive state
	const { isMobile } = useResponsive();

	// Auto-open bottom sheet when an image is selected on mobile
	useEffect(() => {
		if (isMobile && selectedImage && !bottomSheetState.isOpen) {
			bottomSheetState.openBottomSheet();
		}
	}, [
		isMobile,
		selectedImage,
		bottomSheetState.isOpen,
		bottomSheetState.openBottomSheet,
	]);

	// Get the selected dish from MenuV2Context
	const { selectedDish } = useMenuV2();

	// When a dish is selected, ensure the bottom sheet is open
	useEffect(() => {
		if (selectedDish && !bottomSheetState.isOpen) {
			bottomSheetState.openBottomSheet();
		}
	}, [selectedDish, bottomSheetState.isOpen, bottomSheetState.openBottomSheet]);

	return (
		<BottomSheetContext.Provider value={bottomSheetState}>
			{children}
		</BottomSheetContext.Provider>
	);
};

// Hook to use the bottom sheet context
export const useBottomSheetContext = (): BottomSheetContextType => {
	const context = useContext(BottomSheetContext);
	if (!context) {
		throw new Error(
			"useBottomSheetContext must be used within a BottomSheetProvider",
		);
	}
	return context;
};
