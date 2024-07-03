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
	const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
	const [imageLoaded, setImageLoaded] = useState(false);
	const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	const handleImageLoad = () => {
		setImageLoaded(true);
	};

	useEffect(() => {
		if (imageLoaded && imageRef.current) {
			const { clientWidth, clientHeight } = imageRef.current;
			setImgDimensions({ width: clientWidth, height: clientHeight });
		}
	}, [imageLoaded, upload.imageSrc]);

	const calculateFontSize = (boundingBox: BoundingBoxProps) => {
		const minFontSize = 7;
		const baseFontSize =
			Math.min(
				boundingBox.w * imgDimensions.width,
				boundingBox.h * imgDimensions.height,
			) * 0.4;
		return Math.max(baseFontSize, minFontSize);
	};

	const getAdjustedStyles = (boundingBox: BoundingBoxProps) => ({
		width: `${boundingBox.w * imgDimensions.width}px`,
		height: `${boundingBox.h * imgDimensions.height}px`,
		left: `${boundingBox.x * imgDimensions.width}px`,
		top: `${boundingBox.y * imgDimensions.height}px`,
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
							onLoad={handleImageLoad}
						/>
						{imageLoaded &&
							imgDimensions.width > 0 &&
							imgDimensions.height > 0 && (
								<>
									{upload.data.map((value, index) => (
										<React.Fragment key={index}>
											{showTextState !== ShowTextState.HIDE_ALL && (
												<div
													className="absolute"
													style={getAdjustedStyles(value.boundingBox)}
													onClick={() => handleOpenModal(index)}
												>
													<div style={getTextStyle(value.boundingBox)}>
														{showTextState ===
														ShowTextState.SHOW_ONLY_TRANSLATION
															? value.info.textTranslation
															: `${value.info.textTranslation}/${value.info.text}`}
													</div>
												</div>
											)}
											<DishImageCard
												dish={value}
												openModalIndex={openModalIndex}
												setOpenModalIndex={setOpenModalIndex}
												index={index}
												timeStamp={upload.timestamp}
											/>
										</React.Fragment>
									))}
								</>
							)}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
