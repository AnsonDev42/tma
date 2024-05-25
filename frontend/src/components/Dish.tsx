import DishImageCard from "@/components/DishImageCard.tsx";
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
	// track the currently open modal index, used for loading the specific dish image carousel
	const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);

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
			Math.min(boundingBox.w * imgWidth, boundingBox.h * imgHeight) * 0.5; // Adjust scale factor as needed
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

	const handleOpenModal = (index: number) => {
		setOpenModalIndex(index);
		const modalElement = document.getElementById(
			`modal_${index}`,
		) as HTMLDialogElement | null;
		modalElement?.showModal();
	};

	return (
		<div className="flex justify-center items-center p-3 m-2 bg-blue-500 border border-gray-300 rounded-2xl ">
			<TransformWrapper
				doubleClick={{ mode: "reset" }}
				pinch={{ disabled: openModalIndex !== null }}
				wheel={{ disabled: openModalIndex !== null }}
				disabled={openModalIndex !== null}
			>
				<TransformComponent>
					<div
						className="relative max-w-full max-h-screen flex items-start"
						key={menuSrc as string}
					>
						{/* the menu image */}
						<img
							src={menuSrc as string}
							alt="Uploaded"
							className="max-w-full max-h-screen relative"
							ref={imageRef}
						/>
						{/*bounding box and texts */}
						{data.map((value, index) => (
							<>
								{showText && (
									<div
										className="absolute"
										style={getAdjustedStyles(value.boundingBox)}
										onClick={() => handleOpenModal(index)}
									>
										<div style={getTextStyle(value.boundingBox)}>
											{value.info.text}
										</div>
									</div>
								)}
								{/*modal card*/}

								<DishImageCard
									key={index}
									dish={value}
									openModalIndex={openModalIndex}
									setOpenModalIndex={setOpenModalIndex}
									index={index}
								/>
							</>
						))}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
