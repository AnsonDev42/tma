import React from "react";

export function SearchButtons({
	dishname,
}: {
	dishname: string;
}): React.ReactElement {
	return (
		<div className="flex space-x-4">
			<a
				href={`https://www.google.com/search?q=${encodeURIComponent(dishname)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-500 hover:underline"
			>
				Search on Google
			</a>
			<a
				href={`https://wikipedia.org/wiki/${encodeURIComponent(dishname)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-500 hover:underline"
			>
				View on Wikipedia
			</a>
		</div>
	);
}
