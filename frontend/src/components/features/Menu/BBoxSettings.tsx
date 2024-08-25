import React from "react";

interface BBoxSettingsProps {
	opacity: number;
	setOpacity: (value: number) => void;
	textColor: string;
	setTextColor: (value: string) => void;
}

const colors = ["black", "white", "red", "blue", "green", "yellow"];

export const BBoxSettings: React.FC<BBoxSettingsProps> = ({
	opacity,
	setOpacity,
	textColor,
	setTextColor,
}) => {
	return (
		<div className="flex flex-col ">
			<div className="form-control">
				<label className="label">
					<span className="label-text">Overlay Opacity</span>
				</label>
				<input
					type="range"
					min="0"
					max="1"
					step="0.1"
					value={opacity}
					onChange={(e) => {
						setOpacity(parseFloat(e.target.value)),
							console.log(`opacity: ${opacity}`);
					}}
					className="range range-primary"
				/>
			</div>
			<div className="form-control">
				<label className="label">
					<span className="label-text">Text Color</span>
				</label>
				<select
					value={textColor}
					onChange={(e) => setTextColor(e.target.value)}
					className="select select-primary"
				>
					{colors.map((color) => (
						<option key={color} value={color}>
							{color}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
