import { UploadProps } from "@/types/UploadProps.ts";
import {
	getFromLocalStorage,
	saveToLocalStorage,
} from "@/utils/localStorageUtils.ts";

export const addUploadToLocalStorage = (newUpload: UploadProps) => {
	const uploads = getUploadsFromLocalStorage();
	uploads.push(newUpload);
	saveToLocalStorage("uploads", uploads);
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
