// src/utils/localStorageUtils.ts

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const saveToLocalStorage = (key: string, value: any) => {
	localStorage.setItem(key, JSON.stringify(value));
	window.dispatchEvent(new Event("storage"));
};

export const getFromLocalStorage = (key: string) => {
	const data = localStorage.getItem(key);
	return data ? JSON.parse(data) : null;
};
