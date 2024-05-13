import { BoundingBoxProps, DishProps } from "@/App.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

interface ImageResultsProps {
	menuSrc: string | ArrayBuffer | null;
	data: DishProps[];
	imageRef: React.RefObject<HTMLImageElement>;
}

export function ImageResults({
	menuSrc,
	data,
	imageRef,
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
	}, [imageRef, data]);

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
									<p>{value.info.text}</p>
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
