import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/utils/localStorageUploadUtils.ts";
import {
	getFromLocalStorage,
	saveToLocalStorage,
} from "@/utils/localStorageUtils.ts";

export interface CartItem {
	dishId: number;
	uploadTimestamp: string;
}

export interface Cart {
	name: string;
	items: CartItem[];
}

export const addDishToCart = (
	cartName: string,
	dishId: number,
	uploadTimestamp: string,
) => {
	console.log("Adding dish to cart", cartName, dishId, uploadTimestamp);
	const carts = getFromLocalStorage("carts") || [];
	const cart = carts.find((cart: Cart) => cart.name === cartName);
	const newCartItem = { dishId, uploadTimestamp } as CartItem;
	if (cart) {
		cart.items.push(newCartItem);
	} else {
		carts.push({ name: cartName, items: [newCartItem] });
	}
	saveToLocalStorage("carts", carts);
	window.dispatchEvent(new Event("storage"));
};
export const removeDishFromCart = (
	cartName: string,
	dishId: number,
	uploadTimestamp: string,
) => {
	const carts = getFromLocalStorage("carts") || [];
	const cart = carts.find((cart: Cart) => cart.name === cartName);
	if (cart) {
		cart.items = cart.items.filter(
			(item: CartItem) =>
				item.dishId !== dishId || item.uploadTimestamp !== uploadTimestamp,
		);
		saveToLocalStorage("carts", carts);
	}
};
export const createCart = (name: string) => {
	const carts = getFromLocalStorage("carts") || [];
	if (!carts.find((cart: Cart) => cart.name === name)) {
		carts.push({ name, items: [] });
		saveToLocalStorage("carts", carts);
	}
};
export const renameCart = (oldName: string, newName: string) => {
	const carts = getFromLocalStorage("carts") || [];
	const cart = carts.find((cart: Cart) => cart.name === oldName);
	if (cart) {
		cart.name = newName;
		saveToLocalStorage("carts", carts);
	}
};
export const deleteCart = (name: string) => {
	let carts = getFromLocalStorage("carts") || [];
	if (!confirm("Are you sure you want to delete this cart?")) {
		return;
	}
	carts = carts.filter((cart: Cart) => cart.name !== name);
	saveToLocalStorage("carts", carts);
};
export const getCarts = () => {
	return getFromLocalStorage("carts") || [];
};
export const getCartByName = (name: string) => {
	const carts = getFromLocalStorage("carts") || [];

	return carts.find((cart: Cart) => cart.name === name) || null;
};
export const getDishInfoByIdAndTimestamp = (
	dishId: number,
	uploadTimestamp: string,
): DishProps | null => {
	const uploads = getFromLocalStorage("uploads") || [];
	const upload = uploads.find(
		(upload: UploadProps) => upload.timestamp === uploadTimestamp,
	);
	if (upload) {
		return upload.data.find((dish: DishProps) => dish.id === dishId) || null;
	}
	return null;
};
