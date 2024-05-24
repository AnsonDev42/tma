import React from "react";

export function SearchButtons({
	dishname,
}: {
	dishname: string;
}): React.ReactElement {
	return (
		<div className="flex flex-col space-y-2 ">
			<a
				href={`https://www.google.com/search?q=${encodeURIComponent(dishname)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary  hover:underline"
			>
				Search on Google
			</a>
			<a
				href={`https://wikipedia.org/wiki/${encodeURIComponent(dishname)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary hover:underline"
			>
				View on Wikipedia
			</a>
		</div>
	);
}
