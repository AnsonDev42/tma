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
		const minFontSize = 7; // Minimum font size in pixels
		const baseFontSize =
			Math.min(boundingBox.w * imgWidth, boundingBox.h * imgHeight) * 0.3; // Adjust scale factor as needed
		return Math.max(baseFontSize, minFontSize);
	};

	const getAdjustedStyles = (boundingBox: BoundingBoxProps) => ({
		width: `${boundingBox.w * imgWidth}px`,
		height: `${boundingBox.h * imgHeight}px`,
		left: `${boundingBox.x * imgWidth}px`,
		top: `${boundingBox.y * imgHeight}px`,
		background: "rgba(255, 0, 0, 0.5)",
		border: "1px solid red",
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
							<>
								{showText && (
									<div
										className="absolute"
										style={getAdjustedStyles(value.boundingBox)}
										onClick={() => {
											const modalElement = document.getElementById(
												`modal_${index}`,
											) as HTMLDialogElement | null;
											modalElement?.showModal();
										}}
									>
										<div style={getTextStyle(value.boundingBox)}>
											{value.info.text}
										</div>
									</div>
								)}
								<dialog id={`modal_${index}`} className="modal">
									<div className="modal-box">
										<h2 className="font-bold text-xl mb-2">
											{value.info.text}
										</h2>
										<p className="text-gray-700 mb-4">
											{value.info.description}
										</p>

										{value.info.imgSrc && (
											<div className="carousel carousel-center max-w-md p-4 space-x-4 bg-neutral rounded-box">
												{value.info.imgSrc.map((src, imgIndex) => (
													<div className="carousel-item" key={imgIndex}>
														<img
															src={src}
															className="rounded-box max-h-[300px] object-contain"
															alt={`${value.info.text} -img ${imgIndex}`}
														/>
													</div>
												))}
											</div>
										)}

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
									<form method="dialog" className="modal-backdrop">
										<button>close</button>
									</form>
								</dialog>
							</>
						))}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
