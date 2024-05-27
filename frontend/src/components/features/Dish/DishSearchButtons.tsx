import * as process from "node:process";

const SEARCH_URLS = {
	google: (query: string) =>
		`${process.env.googleSearchUrl}${encodeURIComponent(query)}`,
	wikipedia: (query: string) =>
		`${process.env.wikipediaUrl}${encodeURIComponent(query)}`,
};

export function SearchButtons({ dishName }: { dishName: string }) {
	return (
		<div className="flex flex-col space-y-2">
			<a
				href={SEARCH_URLS.google(dishName)}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary hover:underline"
			>
				Search on Google
			</a>
			<a
				href={SEARCH_URLS.wikipedia(dishName)}
				target="_blank"
				rel="noopener noreferrer"
				className="btn btn-sm btn-secondary hover:underline"
			>
				View on Wikipedia
			</a>
		</div>
	);
}
