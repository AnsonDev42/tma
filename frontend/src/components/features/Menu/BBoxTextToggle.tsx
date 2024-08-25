import { ShowTextState } from "@/components/features/Menu/Menu.tsx";
import React, { useEffect, useRef } from "react";

interface MenuToggleProps {
	showTextState: number;
	onToggle: () => void;
}

export const BBoxTextToggle: React.FC<MenuToggleProps> = ({
	showTextState,
	onToggle,
}) => {
	const checkboxRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (checkboxRef.current) {
			if (showTextState == ShowTextState.SHOW_ONLY_TRANSLATION) {
				checkboxRef.current.indeterminate = true;
				checkboxRef.current.checked = false;
			} else {
				checkboxRef.current.indeterminate = false;
				checkboxRef.current.checked = showTextState === ShowTextState.SHOW_BOTH;
			}
		}
	}, [showTextState]);
	useEffect(() => {
		if (checkboxRef.current) {
			checkboxRef.current.indeterminate =
				showTextState === ShowTextState.SHOW_ONLY_TRANSLATION;
		}
	}, [showTextState]);
	return (
		<div className="flex items-center gap-2">
			<input
				type="checkbox"
				id="Show-Bounding-Box-Text"
				className="toggle"
				ref={checkboxRef}
				onChange={onToggle}
			/>
			<label htmlFor="Show-Bounding-Box-Text">
				{showTextState === ShowTextState.HIDE_ALL
					? "Hide all"
					: showTextState === ShowTextState.SHOW_ONLY_TRANSLATION
						? "Show Only Translation"
						: "Show Both Text and Translation"}
			</label>
		</div>
	);
};
