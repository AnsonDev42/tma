import { Menu } from "@/components/features/Menu/Menu";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import { useEffect, useRef } from "react";

interface ImageCarouselProps {
	showTextState: number;
	handleSelectUpload: (upload: UploadProps) => void;
	imgTimestamp: string | null;
	opacity: number;
	textColor: string;
}

function ImageCarousel({
	showTextState,
	handleSelectUpload,
	imgTimestamp,
	opacity: opacity,
	textColor: textColor,
}: ImageCarouselProps) {
	const { uploads } = useUploadsState();
	const carouselRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (uploads.length && carouselRef.current) {
			const latestSlide = carouselRef.current.querySelector(
				`#slide${uploads.length}`,
			);
			latestSlide?.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "center",
			});
		}
	}, [imgTimestamp, uploads.length]);

	return (
		<div ref={carouselRef} className="carousel w-full">
			{uploads.map((upload, index) => (
				<div
					id={`slide${index + 1}`}
					className="carousel-item relative w-full"
					key={upload.timestamp}
				>
					<Menu
						upload={upload}
						showTextState={showTextState}
						opacity={opacity}
						textColor={textColor}
					/>
					<CarouselNavigation
						index={index}
						totalUploads={uploads.length}
						handleSelectUpload={handleSelectUpload}
						uploads={uploads}
					/>
				</div>
			))}
		</div>
	);
}

function CarouselNavigation({
	index,
	totalUploads,
	handleSelectUpload,
	uploads,
}: {
	index: number;
	totalUploads: number;
	handleSelectUpload: (upload: UploadProps) => void;
	uploads: UploadProps[];
}) {
	return (
		<div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
			<CarouselButton
				direction="prev"
				href={`#slide${index === 0 ? totalUploads : index}`}
				onClick={() =>
					handleSelectUpload(
						uploads[index === 0 ? totalUploads - 1 : index - 1],
					)
				}
			/>
			<CarouselButton
				direction="next"
				href={`#slide${((index + 1) % totalUploads) + 1}`}
				onClick={() => handleSelectUpload(uploads[(index + 1) % totalUploads])}
			/>
		</div>
	);
}

function CarouselButton({
	direction,
	href,
	onClick,
}: { direction: "prev" | "next"; href: string; onClick: () => void }) {
	return (
		<a href={href} className="btn btn-circle" onClick={onClick}>
			{direction === "prev" ? "❮" : "❯"}
		</a>
	);
}

export default ImageCarousel;
