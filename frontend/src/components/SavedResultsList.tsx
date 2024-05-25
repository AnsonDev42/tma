import { DishProps } from "@/types/DishProps.tsx";
// src/components/SavedResultsList.tsx
import {
	getUploadsFromLocalStorage,
	removeUploadFromLocalStorage,
} from "@/utils/localStorageUtils.ts";
import { useEffect, useState } from "react";

type SavedResultsListProps = {
	onSelectUpload: (imageSrc: string, data: DishProps[]) => void;
};

const SavedResultsList: React.FC<SavedResultsListProps> = ({
	onSelectUpload,
}) => {
	const [uploads, setUploads] = useState(getUploadsFromLocalStorage());
	useEffect(() => {
		setUploads(getUploadsFromLocalStorage());
	}, []);
	const handleDelete = (timestamp: string) => {
		removeUploadFromLocalStorage(timestamp);
		setUploads(getUploadsFromLocalStorage()); // Update the state
	};
	return (
		<div>
			<h2 className="text-lg font-semibold">Saved Results</h2>
			<ul>
				{/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
				{uploads.map((upload: any, index: number) => (
					<li key={index} className="border p-2 mb-2">
						<button
							onClick={() => onSelectUpload(upload.imageSrc, upload.data)}
							className="text-blue-500 underline"
						>
							{new Date(upload.timestamp).toLocaleString()}
						</button>
						<button
							onClick={() => handleDelete(upload.timestamp)}
							className="text-red-500 underline"
						>
							Delete
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};

export default SavedResultsList;
