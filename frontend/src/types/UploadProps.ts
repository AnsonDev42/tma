import { DishProps } from "@/types/DishProps.tsx";

export interface UploadProps {
	imageSrc: string;
	data: DishProps[];
	timestamp: string;
}
