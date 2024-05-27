import React from "react";

export function SearchButtons({
	dishName,
}: {
	dishName: string;
}): React.ReactElement {
	return (
		<div className="flex flex-col space-y-2 ">
			<a
				href={`https://www.google.com/search?q=${encodeURIComponent(dishName)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary  hover:underline"
			>
				Search on Google
			</a>
			<a
				href={`https://wikipedia.org/wiki/${encodeURIComponent(dishName)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary hover:underline"
			>
				View on Wikipedia
			</a>
		</div>
	);
}
