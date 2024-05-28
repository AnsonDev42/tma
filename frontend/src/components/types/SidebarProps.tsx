import { DishProps } from "@/types/DishProps.tsx";

export type SidebarProps = {
	onSelectUpload: (imageSrc: string, data: DishProps[]) => void;
};
