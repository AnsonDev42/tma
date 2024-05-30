import DishImageCard from "@/components/features/Dish/DishImageCard.tsx";
import { BoundingBoxProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import React, { useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

interface ImageResultsProps {
	upload: UploadProps;
	showTextState: number;
}
export const ShowTextState = {
	HIDE_ALL: 0,
	SHOW_ONLY_TRANSLATION: 1,
	SHOW_BOTH: 2,
};
export function MenuResults({
	upload,
	showTextState,
}: ImageResultsProps): React.ReactElement {
	const [imgWidth, setImgWidth] = useState(0);
	const [imgHeight, setImgHeight] = useState(0);
	// track the currently open modal index, used for loading the specific dish image carousel
	const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
	const imageRef = useRef<HTMLImageElement>(null); // Specify the type here
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
		// Call updateScale whenever new data is received
		updateScale();
	}, [upload]);

	const calculateFontSize = (boundingBox: BoundingBoxProps) => {
		const minFontSize = 7; // Minimum font size in pixels
		const baseFontSize =
			Math.min(boundingBox.w * imgWidth, boundingBox.h * imgHeight) * 0.4; // Adjust scale factor as needed
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
						key={upload.imageSrc as string}
					>
						{/* the menu image */}
						<img
							src={upload.imageSrc as string}
							alt="Uploaded"
							className="max-w-full max-h-screen relative"
							ref={imageRef}
						/>
						{/*bounding box and texts */}
						{upload.data.map((value, index) => (
							<>
								{showTextState !== ShowTextState.HIDE_ALL && (
									<div
										className="absolute"
										style={getAdjustedStyles(value.boundingBox)}
										onClick={() => handleOpenModal(index)}
									>
										<div style={getTextStyle(value.boundingBox)}>
											{showTextState === ShowTextState.SHOW_ONLY_TRANSLATION
												? value.info.textTranslation
												: `${value.info.textTranslation}/${value.info.text}`}
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
									timeStamp={upload.timestamp}
								/>
							</>
						))}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
