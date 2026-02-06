import { BoundingBoxProps } from "@/types/DishProps.tsx";

export type MenuAnalyzeResultInfo = {
	text?: string;
	text_translation?: string;
	description?: string;
	img_src?: string[];
	[key: string]: unknown;
};

export type MenuAnalyzeResult = {
	info?: MenuAnalyzeResultInfo;
	boundingBox?: Partial<BoundingBoxProps>;
	[key: string]: unknown;
};

export type MenuAnalyzeResponse = {
	results: MenuAnalyzeResult[];
};

export type DemoPreset = {
	id: string;
	label: string;
	description: string;
	languageLabel: string;
	imageSrc: string;
	dataUrl: string;
};
