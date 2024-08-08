import DishImageCard from "@/components/features/Dish/DishImageCard";
import { BoundingBoxProps, DishProps } from "@/types/DishProps";
import { UploadProps } from "@/types/UploadProps";
import React, { useState, useRef, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export const ShowTextState = {
	HIDE_ALL: 0,
	SHOW_ONLY_TRANSLATION: 1,
	SHOW_BOTH: 2,
};

interface MenuProps {
	upload: UploadProps;
	showTextState: number;
}

export function Menu({ upload, showTextState }: MenuProps): React.ReactElement {
	const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
	const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const updateImageDimensions = () => {
		if (imageRef.current) {
			const { width, height } = imageRef.current.getBoundingClientRect();
			setImgDimensions({ width, height });
		}
	};

	useEffect(() => {
		updateImageDimensions();
		window.addEventListener('resize', updateImageDimensions);
		return () => window.removeEventListener('resize', updateImageDimensions);
	}, [upload.imageSrc]);

	// Use ResizeObserver to detect changes in the container size
	useEffect(() => {
		const resizeObserver = new ResizeObserver(updateImageDimensions);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}
		return () => resizeObserver.disconnect();
	}, []);

	return (
		<div className="flex justify-center items-center p-3 m-2 bg-blue-500 border border-gray-300 rounded-2xl">
			<TransformWrapper
				doubleClick={{ mode: "reset" }}
				pinch={{ disabled: openModalIndex !== null }}
				wheel={{ disabled: openModalIndex !== null }}
				disabled={openModalIndex !== null}
			>
				<TransformComponent>
					<div ref={containerRef} className="relative max-w-full max-h-screen flex items-start">
						<img
							src={upload.imageSrc as string}
							alt="Uploaded"
							className="max-w-full max-h-screen relative"
							ref={imageRef}
							onLoad={updateImageDimensions}
						/>
						{imgDimensions.width > 0 && imgDimensions.height > 0 && (
							<>
								{upload.data.map((dish, index) => (
									<DishOverlay
										key={index}
										dish={dish}
										index={index}
										showTextState={showTextState}
										imgDimensions={imgDimensions}
										openModalIndex={openModalIndex}
										setOpenModalIndex={setOpenModalIndex}
										uploadTimestamp={upload.timestamp}
									/>
								))}
							</>
						)}
					</div>
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}

interface DishOverlayProps {
	dish: DishProps;
	index: number;
	showTextState: number;
	imgDimensions: { width: number; height: number };
	openModalIndex: number | null;
	setOpenModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
	uploadTimestamp: string;
}

function DishOverlay({
	dish,
	index,
	showTextState,
	imgDimensions,
	openModalIndex,
	setOpenModalIndex,
	uploadTimestamp,
}: DishOverlayProps) {
	const handleOpenModal = () => setOpenModalIndex(index);

	const overlayStyle = getOverlayStyle(dish.boundingBox, imgDimensions);
	const textStyle = getTextStyle(dish.boundingBox, imgDimensions);

	return (
		<>
			{showTextState !== ShowTextState.HIDE_ALL && (
				<div className="absolute" style={overlayStyle} onClick={handleOpenModal}>
					<div style={textStyle}>
						{showTextState === ShowTextState.SHOW_ONLY_TRANSLATION
							? dish.info.textTranslation
							: `${dish.info.textTranslation}/${dish.info.text}`}
					</div>
				</div>
			)}
			<DishImageCard
				dish={dish}
				openModalIndex={openModalIndex}
				setOpenModalIndex={setOpenModalIndex}
				index={index}
				timeStamp={uploadTimestamp}
			/>
		</>
	);
}

function getOverlayStyle(boundingBox: BoundingBoxProps, imgDimensions: { width: number; height: number }) {
	return {
		width: `${boundingBox.w * imgDimensions.width}px`,
		height: `${boundingBox.h * imgDimensions.height}px`,
		left: `${boundingBox.x * imgDimensions.width}px`,
		top: `${boundingBox.y * imgDimensions.height}px`,
		background: "rgba(255, 0, 0, 0.5)",
		border: "1px solid red",
	};
}

function getTextStyle(boundingBox: BoundingBoxProps, imgDimensions: { width: number; height: number }) {
	const fontSize = Math.max(
		Math.min(boundingBox.w * imgDimensions.width, boundingBox.h * imgDimensions.height) * 0.4,
		7
	);

	return {
		fontSize: `${fontSize}px`,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: "white",
	};
}