import { UploadProps } from "@/types/UploadProps.ts";

export const useGroupedUploads = (uploads: UploadProps[]) => {
	const now = new Date();

	const groupUploadsByTimeRange = () => {
		const today = uploads.filter(
			(upload) =>
				new Date(upload.timestamp).toDateString() === now.toDateString(),
		);
		const yesterday = uploads.filter((upload) => {
			const date = new Date(upload.timestamp);
			return (
				date.toDateString() ===
				new Date(now.setDate(now.getDate() - 1)).toDateString()
			);
		});
		const previous3Days = uploads.filter((upload) => {
			const date = new Date(upload.timestamp);
			return (
				date >= new Date(now.setDate(now.getDate() - 4)) &&
				date < new Date(now.setDate(now.getDate() + 1))
			);
		});
		const earlier = uploads.filter((upload) => {
			const date = new Date(upload.timestamp);
			return date < new Date(now.setDate(now.getDate() - 4));
		});

		return { today, yesterday, previous3Days, earlier };
	};

	return groupUploadsByTimeRange();
};
