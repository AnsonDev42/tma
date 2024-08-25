import { GlobalDishCard } from "@/components/features/Dish/GlobalDishCard.tsx";
import { ShowTextState } from "@/components/features/Menu/Menu.tsx";
import { HistoryProps } from "@/components/types/HistoryProps.ts";
import { UploadProps } from "@/types/UploadProps.ts";
import { useGroupedUploads } from "@/utils/hooks/useGroupedUploads.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import React from "react";

const HistoryList: React.FC<HistoryProps> = ({ onSelectUpload }) => {
	const { uploads, deleteUpload } = useUploadsState();
	const [_openModal, setOpenModal] = React.useState<boolean>(false);

	const { today, yesterday, previous3Days, earlier } =
		useGroupedUploads(uploads);
	const handleDelete = (timestamp: string) => {
		if (
			window.confirm("Are you sure you want to delete this menu from history?")
		) {
			deleteUpload(timestamp);
		}
	};
	const renderDishes = (upload: UploadProps) => {
		return upload.data.map((dish, index) => (
			<li
				key={index}
				className="items-start justify-start m-0.5 grid grid-flow-col text-wrap break-words"
			>
				<input type="checkbox" className="checkbox" /> {index} -
				<div>
					<GlobalDishCard
						dish={dish}
						timeStamp={upload.timestamp}
						showTextState={ShowTextState.SHOW_BOTH}
						isCartView={1}
						setOpenModal={setOpenModal}
					/>
				</div>
			</li>
		));
	};
	const renderUploads = (uploads: UploadProps[]) => {
		return uploads.map((upload) => (
			<li
				key={upload.timestamp}
				className="flex flex-col border p-2 mb-2 flex-wrap"
			>
				<details open>
					<summary>
						<button
							onClick={() => onSelectUpload(upload)}
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
					</summary>
					<ul>{renderDishes(upload)}</ul>
				</details>
			</li>
		));
	};

	return (
		<ul className="menu max-w-fit">
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
			<li>
				<a>*We store your data in your browser.</a>
			</li>
			<li>
				{/* button that clears all local storage */}
				<button
					className={"btn btn-error"}
					onClick={() => {
						if (
							window.confirm(
								"You will lose all local storage data in this site! \n\n" +
									"Are you sure to remove all the data?",
							)
						) {
							localStorage.clear();
							//  trigger the storage event to update the history list
							window.dispatchEvent(new Event("storage"));
						}
						return;
					}}
				>
					Nuke them all !
				</button>
			</li>
		</ul>
	);
};

export default HistoryList;
