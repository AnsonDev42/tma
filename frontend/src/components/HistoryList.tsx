import { DishProps } from "@/types/DishProps.tsx";
// src/components/SavedResultsList.tsx
import {
	UploadProps,
	getUploadsFromLocalStorage,
	removeUploadFromLocalStorage,
} from "@/utils/localStorageUtils.ts";
import { useEffect, useState } from "react";

type HistoryProps = {
	onSelectUpload: (imageSrc: string, data: DishProps[]) => void;
};

const HistoryList: React.FC<HistoryProps> = ({ onSelectUpload }) => {
	const [uploads, setUploads] = useState(getUploadsFromLocalStorage());

	useEffect(() => {
		setUploads(getUploadsFromLocalStorage());
	}, []);

	const handleDelete = (timestamp: string) => {
		removeUploadFromLocalStorage(timestamp);
		setUploads(getUploadsFromLocalStorage()); // Update the state
	};

	const groupUploadsByTimeRange = () => {
		const now = new Date();
		const today = uploads.filter(
			(upload: UploadProps) =>
				new Date(upload.timestamp).toDateString() === now.toDateString(),
		);
		const yesterday = uploads.filter((upload: UploadProps) => {
			const date = new Date(upload.timestamp);
			return (
				date.toDateString() ===
				new Date(now.setDate(now.getDate() - 1)).toDateString()
			);
		});
		const previous3Days = uploads.filter((upload: UploadProps) => {
			const date = new Date(upload.timestamp);
			return (
				date >= new Date(now.setDate(now.getDate() - 4)) &&
				date < new Date(now.setDate(now.getDate() + 1))
			);
		});
		const earlier = uploads.filter((upload: UploadProps) => {
			const date = new Date(upload.timestamp);
			return date < new Date(now.setDate(now.getDate() - 4));
		});

		return { today, yesterday, previous3Days, earlier };
	};

	const { today, yesterday, previous3Days, earlier } =
		groupUploadsByTimeRange();

	const renderUploads = (uploads: UploadProps[]) => {
		return uploads.map((upload, index) => (
			<li key={index} className="flex flex-col border p-2 mb-2">
				<button
					onClick={() => onSelectUpload(upload.imageSrc, upload.data)}
					className="text-info underline"
				>
					{new Date(upload.timestamp).toLocaleString()}
				</button>
				<button
					onClick={() => handleDelete(upload.timestamp)}
					className=" text-red-500 underline ml-2"
				>
					Delete
				</button>
			</li>
		));
	};

	return (
		<ul className="menu ">
			<li>
				<li>
					<a>*We store your data in your browser.</a>
				</li>
				<details open>
					<summary>Today</summary>
					<ul>{renderUploads(today)}</ul>
				</details>
				<details open>
					<summary>Yesterday</summary>
					<ul>{renderUploads(yesterday)}</ul>
				</details>
				<details open>
					<summary>Previous 3 Days</summary>
					<ul>{renderUploads(previous3Days)}</ul>
				</details>
				<details open>
					<summary>Earlier</summary>
					<ul>{renderUploads(earlier)}</ul>
				</details>
			</li>
		</ul>
	);
};

export default HistoryList;
