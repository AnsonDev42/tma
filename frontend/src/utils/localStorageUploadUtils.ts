import { DishProps } from "@/types/DishProps.tsx";
import {
	getFromLocalStorage,
	saveToLocalStorage,
} from "@/utils/localStorageUtils.ts";

export interface UploadProps {
	imageSrc: string;
	data: DishProps[];
	timestamp: string;
}

export const addUploadToLocalStorage = (
	imageSrc: string,
	data: DishProps[],
) => {
	const uploads = getUploadsFromLocalStorage();
	const newUpload = {
		imageSrc,
		data,
		timestamp: new Date().toISOString(),
	} as UploadProps;
	uploads.push(newUpload);
	saveToLocalStorage("uploads", uploads);
	return newUpload.timestamp;
};
export const getUploadsFromLocalStorage = () => {
	return (getFromLocalStorage("uploads") || []) as UploadProps[];
};
export const removeUploadFromLocalStorage = (timestamp: string) => {
	let uploads = getFromLocalStorage("uploads") || [];
	uploads = uploads.filter(
		(upload: UploadProps) => upload.timestamp !== timestamp,
	);
	saveToLocalStorage("uploads", uploads);
};
