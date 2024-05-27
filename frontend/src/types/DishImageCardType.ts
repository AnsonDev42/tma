import { DishProps } from "@/types/DishProps.tsx";
import React from "react";

export type DishImageCardProps = {
	dish: DishProps;
	openModalIndex: number | null;
	setOpenModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
	index: number;
	timeStamp: string;
};
