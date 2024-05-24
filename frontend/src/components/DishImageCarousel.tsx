import { DishProps } from "@/types/DishProps.tsx";
import React from "react";
export function DishImageCarousel({
	dish,
}: { dish: DishProps }): React.ReactElement {
	return (
		<>
			{dish.info.imgSrc && (
				<div className="carousel carousel-center max-w-md p-4 space-x-4 bg-neutral rounded-box">
					{dish.info.imgSrc.map((src: string, imgIndex: number) => (
						<div className="carousel-item" key={imgIndex}>
							<img
								src={src}
								className="rounded-box max-h-[300px] object-contain"
								alt={`${dish.info.text} -img ${imgIndex}`}
							/>
						</div>
					))}
				</div>
			)}
		</>
	);
}

export default DishImageCarousel;
