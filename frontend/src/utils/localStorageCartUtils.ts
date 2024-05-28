import { Cart, CartItem } from "@/types/CartTypes.ts";
import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import {
	getFromLocalStorage,
	saveToLocalStorage,
} from "@/utils/localStorageUtils.ts";

function saveCartToLocalStorage(carts: Cart[]) {
	saveToLocalStorage("carts", carts);
	window.dispatchEvent(new Event("storage"));
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
	saveCartToLocalStorage(carts);
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
		saveCartToLocalStorage(carts);
	}
};
export const createCart = (name: string) => {
	const carts = getFromLocalStorage("carts") || [];
	if (!carts.find((cart: Cart) => cart.name === name)) {
		carts.push({ name, items: [] });
		saveCartToLocalStorage(carts);
	}
};
export const renameCart = (oldName: string, newName: string) => {
	const carts = getFromLocalStorage("carts") || [];
	const cart = carts.find((cart: Cart) => cart.name === oldName);
	if (cart) {
		cart.name = newName;
		saveCartToLocalStorage(carts);
	}
};
export const deleteCart = (name: string) => {
	let carts = getFromLocalStorage("carts") || [];
	if (!confirm("Are you sure you want to delete this cart?")) {
		return;
	}
	carts = carts.filter((cart: Cart) => cart.name !== name);
	saveCartToLocalStorage(carts);
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
