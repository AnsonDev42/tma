import { DishProps } from "@/types/DishProps.tsx";

export interface UploadProps {
	imageSrc: string | ArrayBuffer | null;
	data: DishProps[];
	timestamp: string;
}
