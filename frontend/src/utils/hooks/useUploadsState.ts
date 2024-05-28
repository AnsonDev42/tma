import { UploadProps } from "@/types/UploadProps.ts";
import {
	getUploadsFromLocalStorage,
	removeUploadFromLocalStorage,
} from "@/utils/localStorageUploadUtils.ts";
import { useEffect, useState } from "react";

export const useUploadsState = () => {
	const [uploads, setUploads] = useState<UploadProps[]>(
		getUploadsFromLocalStorage(),
	);

	useEffect(() => {
		const handleStorageChange = () => {
			setUploads(getUploadsFromLocalStorage());
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	const deleteUpload = (timestamp: string) => {
		removeUploadFromLocalStorage(timestamp);
		setUploads(getUploadsFromLocalStorage());
	};

	return { uploads, setUploads, deleteUpload };
};
