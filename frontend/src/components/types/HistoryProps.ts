import { DishProps } from "@/types/DishProps.tsx";

export type HistoryProps = {
	onSelectUpload: (imageSrc: string, data: DishProps[]) => void;
};
