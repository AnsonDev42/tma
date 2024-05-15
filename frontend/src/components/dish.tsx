import { BoundingBoxProps, DishProps } from "@/App.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

interface ImageResultsProps {
	menuSrc: string | ArrayBuffer | null;
	data: DishProps[];
	imageRef: React.RefObject<HTMLImageElement>;
	showText: boolean;
}

export function ImageResults({
	menuSrc,
	data,
	imageRef,
	showText,
}: ImageResultsProps): React.ReactElement {
	const [imgWidth, setImgWidth] = useState(0);
	const [imgHeight, setImgHeight] = useState(0);

	useEffect(() => {
		const updateScale = () => {
			const imageElement = imageRef.current;
			if (imageElement) {
				const renderedWidth = imageElement.clientWidth;
				const renderedHeight = imageElement.clientHeight;
				setImgWidth(renderedWidth);
				setImgHeight(renderedHeight);
			}
		};

		window.addEventListener("resize", updateScale);
		window.addEventListener("load", updateScale);
		window.addEventListener("DOMContentLoaded", updateScale);
		window.addEventListener("readystatechange", updateScale);

		// Initial scale update when the image loads
		updateScale();

		return () => window.removeEventListener("resize", updateScale);
	}, [imageRef]);
	const calculateFontSize = (boundingBox: BoundingBoxProps) => {
		const minFontSize = 10; // Minimum font size in pixels
		const baseFontSize =
			Math.min(boundingBox.w * imgWidth, boundingBox.h * imgHeight) * 0.2; // Adjust scale factor as needed
		return Math.max(baseFontSize, minFontSize);
	};

	const getAdjustedStyles = (boundingBox: BoundingBoxProps) => {
		// Calculate adjusted bounding box based on the image scale
		return {
			width: `${boundingBox.w * imgWidth}px`,
			height: `${boundingBox.h * imgHeight}px`,
			left: `${boundingBox.x * imgWidth}px`,
			top: `${boundingBox.y * imgHeight}px`,
			background: "rgba(255, 0, 0, 0.5)",
			border: "1px solid red",
		};
	};
	const getTextStyle = (boundingBox: BoundingBoxProps) => ({
		fontSize: `${calculateFontSize(boundingBox)}px`,
		overflow: "hidden", // Ensures that text does not overflow the bounding box
		textOverflow: "ellipsis", // Adds an ellipsis if the text overflows
		whiteSpace: "nowrap", // Keeps the text on a single line
		color: "white",
	});
	return (
		<div className="relative">
			<img
				src={menuSrc as string}
				alt="Uploaded"
				ref={imageRef}
				className="absolute max-w-lg"
			/>
			{data.map((value, index) => {
				return (
					<div>
						<Dialog key={index}>
							<DialogTrigger asChild>
								<div
									key={index}
									className="absolute"
									style={getAdjustedStyles(value.boundingBox)}
								>
									{showText && (
										<div style={getTextStyle(value.boundingBox)}>
											{value.info.text}
										</div>
									)}
								</div>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<h2>{value.info.text}</h2>
								{value.info.imgSrc && (
									<img
										src={value.info.imgSrc}
										alt={`${value.info.text} image`}
									/>
								)}
								<p>{value.info.description}</p>
							</DialogContent>
						</Dialog>
					</div>
				);
			})}
		</div>
	);
}
