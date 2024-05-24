export type BoundingBoxProps = {
	x: number;
	y: number;
	w: number;
	h: number;
};
export type DishProps = {
	id: number;
	boundingBox: BoundingBoxProps;
	info: {
		text: string;
		imgSrc: string[];
		description: string;
	};
};
