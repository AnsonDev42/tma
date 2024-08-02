import { MenuResults } from "@/components/features/Menu/Menu.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import { useEffect, useRef } from "react";

interface ImageCarouselProps {
	showTextState: number;
	handleSelectUpload: (upload: UploadProps) => void;
	imgTimestamp: string | null;
}

function ImageCarousel({
	showTextState,
	handleSelectUpload,
	imgTimestamp,
}: ImageCarouselProps) {
	const { uploads } = useUploadsState();

	const imageResultsRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (uploads.length !== 0) {
			// 	jump to anker of the last upload
			const latestSlide = document.querySelector<HTMLDivElement>(
				`#slide${uploads.length}`,
			)!;
			if (latestSlide) {
				latestSlide.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "center",
				});
			}
		}
	}, [imgTimestamp]);
	return (
		<div ref={imageResultsRef}>
			<div className="carousel w-full">
				{uploads.map((upload, index) => (
					<div
						id={`slide${index + 1}`}
						className="carousel-item relative w-full"
						key={upload.timestamp}
					>
						<MenuResults upload={upload} showTextState={showTextState} />
						{/* the pagination arrows */}
						<div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
							<a
								href={`#slide${index === 0 ? uploads.length : index}`}
								onClick={() =>
									handleSelectUpload(
										uploads[index === 0 ? uploads.length - 1 : index - 1],
									)
								}
								className="btn btn-circle"
							>
								❮
							</a>
							<a
								href={`#slide${((index + 1) % uploads.length) + 1}`}
								className="btn btn-circle"
								onClick={() =>
									handleSelectUpload(uploads[(index + 1) % uploads.length])
								}
							>
								❯
							</a>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default ImageCarousel;
