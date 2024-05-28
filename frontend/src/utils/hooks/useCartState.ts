import { CartItem } from "@/types/CartTypes.ts";
import {
	addDishToCart,
	getCartByName,
	removeDishFromCart,
} from "@/utils/localStorageCartUtils.ts";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const useCartState = (
	dishId: number,
	timeStamp: string,
	cartName = "My Cart",
): [boolean, (checked: boolean) => void] => {
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		const cart = getCartByName(cartName);
		if (cart) {
			const isInCart = cart.items.some(
				(item: CartItem) =>
					item.dishId === dishId && item.uploadTimestamp === timeStamp,
			);
			setIsChecked(isInCart);
		}
	}, [timeStamp, dishId, cartName]);

	const handleCheckboxChange = (checked: boolean) => {
		setIsChecked(checked);
		if (checked) {
			toast.success(`Dish added to cart`);
			addDishToCart(cartName, dishId, timeStamp);
		} else {
			removeDishFromCart(cartName, dishId, timeStamp);
		}
	};

	return [isChecked, handleCheckboxChange];
};
