// src/utils/localStorageUtils.ts
import { DishProps } from "@/types/DishProps.tsx";

export interface UploadProps {
	imageSrc: string;
	data: DishProps[];
	timestamp: string;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const saveToLocalStorage = (key: string, value: any) => {
	localStorage.setItem(key, JSON.stringify(value));
	window.dispatchEvent(new Event("storage"));
};

export const getFromLocalStorage = (key: string) => {
	const data = localStorage.getItem(key);
	return data ? JSON.parse(data) : null;
};

export const addUploadToLocalStorage = (
	imageSrc: string,
	data: DishProps[],
) => {
	const uploads = (getFromLocalStorage("uploads") as UploadProps[]) || [];
	const newUpload = {
		imageSrc,
		data,
		timestamp: new Date().toISOString(),
	} as UploadProps;
	uploads.push(newUpload);
	saveToLocalStorage("uploads", uploads);
};

export const getUploadsFromLocalStorage = () => {
	return getFromLocalStorage("uploads") || [];
};
export const removeUploadFromLocalStorage = (timestamp: string) => {
	let uploads = getFromLocalStorage("uploads") || [];
	uploads = uploads.filter(
		(upload: UploadProps) => upload.timestamp !== timestamp,
	);
	saveToLocalStorage("uploads", uploads);
};
