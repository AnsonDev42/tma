import { BoundingBoxProps, DishProps } from "@/types/DishProps";
import { UploadProps } from "@/types/UploadProps";
import React, { useState, useRef, useEffect } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { GlobalDishCard } from "../Dish/GlobalDishCard";

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
	const [openModal, setOpenModal] = useState(false);
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
		window.addEventListener("resize", updateImageDimensions);
		return () => window.removeEventListener("resize", updateImageDimensions);
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
				pinch={{ disabled: openModal }}
				wheel={{ disabled: openModal }}
				disabled={openModal}
			>
				<TransformComponent>
					<div
						ref={containerRef}
						className="relative max-w-full max-h-screen flex items-start"
					>
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
										showTextState={showTextState}
										imgDimensions={imgDimensions}
										uploadTimestamp={upload.timestamp}
										setOpenModal={setOpenModal}
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
	showTextState: number;
	imgDimensions: { width: number; height: number };
	uploadTimestamp: string;
	setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}

function DishOverlay({
	dish,
	showTextState,
	imgDimensions,
	uploadTimestamp,
	setOpenModal,
}: DishOverlayProps) {
	const overlayStyle = getOverlayStyle(dish.boundingBox, imgDimensions);
	const textStyle = getTextStyle(dish.boundingBox, imgDimensions);

	return (
		<>
			{showTextState !== ShowTextState.HIDE_ALL && (
				<div className="absolute" style={overlayStyle}>
					<div style={textStyle}>
						<GlobalDishCard
							dish={dish}
							timeStamp={uploadTimestamp}
							showTextState={showTextState}
							isCartView={0}
							setOpenModal={setOpenModal}
						/>
					</div>
				</div>
			)}
		</>
	);
}

function getOverlayStyle(
	boundingBox: BoundingBoxProps,
	imgDimensions: { width: number; height: number },
) {
	return {
		width: `${boundingBox.w * imgDimensions.width}px`,
		height: `${boundingBox.h * imgDimensions.height}px`,
		left: `${boundingBox.x * imgDimensions.width}px`,
		top: `${boundingBox.y * imgDimensions.height}px`,
		background: "rgba(255, 0, 0, 0.5)",
		border: "1px solid red",
	};
}

function getTextStyle(
	boundingBox: BoundingBoxProps,
	imgDimensions: { width: number; height: number },
) {
	const fontSize = Math.max(
		Math.min(
			boundingBox.w * imgDimensions.width,
			boundingBox.h * imgDimensions.height,
		) * 0.4,
		7,
	);

	return {
		fontSize: `${fontSize}px`,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: "white",
	};
}
