import { MenuResults } from "@/components/features/Menu/Menu.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useRef } from "react";

interface ImageCarouselProps {
	uploads: UploadProps[];
	showTextState: number;
	handleSelectUpload: (upload: UploadProps) => void;
}

function ImageCarousel({
	uploads,
	showTextState,
	handleSelectUpload,
}: ImageCarouselProps) {
	const imageResultsRef = useRef<HTMLDivElement | null>(null);

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
						<div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
							<a
								href={`#slide${index === 0 ? uploads.length : index}`}
								onClick={() => handleSelectUpload(upload)}
								className="btn btn-circle"
							>
								❮
							</a>
							<a
								href={`#slide${((index + 1) % uploads.length) + 1}`}
								className="btn btn-circle"
								onClick={() => {
									handleSelectUpload(upload);
								}}
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
