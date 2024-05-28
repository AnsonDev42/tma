import { Cart, CartItem } from "@/types/CartTypes.ts";
import { DishProps } from "@/types/DishProps.tsx";
import {
	deleteCart,
	getCartByName,
	getCarts,
	getDishInfoByIdAndTimestamp,
	removeDishFromCart,
} from "@/utils/localStorageCartUtils.ts";
import { useEffect, useState } from "react";

export const useCart = (cartName: string) => {
	const [cart, setCart] = useState<Cart | null>(getCartByName(cartName));

	useEffect(() => {
		const handleStorageEvent = () => {
			setCart(getCartByName(cartName));
		};

		window.addEventListener("storage", handleStorageEvent);

		return () => {
			window.removeEventListener("storage", handleStorageEvent);
		};
	}, [cartName]);

	const deleteCurrentCart = () => {
		deleteCart(cartName);
		setCart(getCarts()[0]);
	};

	const removeDish = (dishId: number, timestamp: string) => {
		removeDishFromCart(cartName, dishId, timestamp);
	};

	const dishes =
		cart?.items.map((item: CartItem) => ({
			dish: getDishInfoByIdAndTimestamp(
				item.dishId,
				item.uploadTimestamp,
			) as DishProps,
			timestamp: item.uploadTimestamp,
		})) || [];

	return { cart, dishes, deleteCurrentCart, removeDish };
};
