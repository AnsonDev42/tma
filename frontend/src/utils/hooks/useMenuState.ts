import { useState, useEffect } from "react";
import { ShowTextState } from "@/components/features/Menu/Menu.tsx";
import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";

export const useMenuState = () => {
	const [showTextState, setShowTextState] = useState(
		ShowTextState.SHOW_ONLY_TRANSLATION,
	);
	const [menuSrc, setMenuSrc] = useState<string | ArrayBuffer | null>(null);
	const [data, setData] = useState<DishProps[]>([]);
	const [imgTimestamp, setImgTimestamp] = useState<string | null>(null);
	const { uploads } = useUploadsState();

	useEffect(() => {
		if (uploads.length !== 0) {
			const latestUpload = uploads[uploads.length - 1];
			setImgTimestamp(latestUpload.timestamp);
			setData(latestUpload.data);
			setMenuSrc(latestUpload.imageSrc);
		}
	}, [uploads]);

	const handleToggleTextState = () => {
		setShowTextState((prev) => (prev + 1) % 3);
	};

	const handleSelectUpload = (upload: UploadProps) => {
		setData(upload.data);
		setMenuSrc(upload.imageSrc);
		setImgTimestamp(upload.timestamp);
	};

	return {
		showTextState,
		menuSrc,
		data,
		imgTimestamp,
		uploads,
		handleToggleTextState,
		handleSelectUpload,
	};
};
