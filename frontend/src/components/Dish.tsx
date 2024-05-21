import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { BoundingBoxProps, DishProps } from "@/types/DishProps.tsx";
import React, { useEffect, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

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
	const updateScale = () => {
		const imageElement = imageRef.current;
		if (imageElement) {
			const renderedWidth = imageElement.clientWidth;
			const renderedHeight = imageElement.clientHeight;
			setImgWidth(renderedWidth);
			setImgHeight(renderedHeight);
		}
	};

	useEffect(() => {
		const imageElement = imageRef.current;

		const handleImageLoad = () => {
			updateScale();
		};

		if (imageElement) {
			imageElement.addEventListener("load", handleImageLoad);
			if (imageElement.complete) {
				handleImageLoad();
			}
		}

		window.addEventListener("resize", updateScale);

		return () => {
			if (imageElement) {
				imageElement.removeEventListener("load", handleImageLoad);
			}
			window.removeEventListener("resize", updateScale);
		};
	}, [imageRef]);

	useEffect(() => {
		// Call updateScale whenever new data is received
		updateScale();
	}, [data]);

	const calculateFontSize = (boundingBox: BoundingBoxProps) => {
		const minFontSize = 10; // Minimum font size in pixels
		const baseFontSize =
			Math.min(boundingBox.w * imgWidth, boundingBox.h * imgHeight) * 0.2; // Adjust scale factor as needed
		return Math.max(baseFontSize, minFontSize);
	};

	const getAdjustedStyles = (boundingBox: BoundingBoxProps) => ({
		width: `${boundingBox.w * imgWidth}px`,
		height: `${boundingBox.h * imgHeight}px`,
		left: `${boundingBox.x * imgWidth}px`,
		top: `${boundingBox.y * imgHeight}px`,
		background: "rgba(255, 0, 0, 0.5)",
		border: "1px solid red",
		position: "absolute",
	});

	const getTextStyle = (boundingBox: BoundingBoxProps) => ({
		fontSize: `${calculateFontSize(boundingBox)}px`,
		overflow: "hidden", // Ensures that text does not overflow the bounding box
		textOverflow: "ellipsis", // Adds an ellipsis if the text overflows
		whiteSpace: "nowrap", // Keeps the text on a single line
		color: "white",
	});

	return (
		<div className="flex justify-center items-center p-3 m-2 bg-blue-500 border border-gray-300 rounded-2xl ">
			<TransformWrapper>
				<TransformComponent>
					<div className="relative max-w-full max-h-screen flex items-start">
						<img
							src={menuSrc as string}
							alt="Uploaded"
							className="max-w-full max-h-screen relative"
							ref={imageRef}
						/>

						{data.map((value, index) => (
							<Popover key={index}>
								{showText && (
									<PopoverTrigger asChild>
										<div
											key={index}
											className="absolute"
											style={getAdjustedStyles(value.boundingBox)}
										>
											<div style={getTextStyle(value.boundingBox)}>
												{value.info.text}
											</div>
										</div>
									</PopoverTrigger>
								)}
								<PopoverContent className="max-w-sm p-6 bg-white rounded-lg shadow-lg">
									<div className="flex flex-col items-center">
										{value.info.imgSrc && (
											<img
												src={value.info.imgSrc}
												alt={`${value.info.text} image`}
												className="w-full h-40 object-cover rounded-t-lg mb-4"
											/>
										)}
										<h2 className="font-bold text-xl mb-2">
											{value.info.text}
										</h2>
										<p className="text-gray-700 mb-4">
											{value.info.description}
										</p>
										<div className="flex space-x-4">
											<a
												href={`https://www.google.com/search?q=${encodeURIComponent(
													value.info.text,
												)}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-500 hover:underline"
											>
												Search on Google
											</a>
											<a
												href={`https://wikipedia.org/wiki/${encodeURIComponent(
													value.info.text,
												)}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-500 hover:underline"
											>
												View on Wikipedia
											</a>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						))}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
