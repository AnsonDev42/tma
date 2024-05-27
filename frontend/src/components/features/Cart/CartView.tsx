import { Cart, CartItem } from "@/types/CartTypes";
import { DishProps } from "@/types/DishProps";
import {
	deleteCart,
	getCartByName,
	getDishInfoByIdAndTimestamp,
	removeDishFromCart,
} from "@/utils/localStorageCartUtils";
import React, { useEffect, useState } from "react";

const CartView: React.FC = () => {
	const [cart, setCart] = useState<Cart | null>(getCartByName("My Cart"));

	useEffect(() => {
		const handleStorageEvent = () => {
			setCart(getCartByName("My Cart"));
		};

		window.addEventListener("storage", handleStorageEvent);

		return () => {
			window.removeEventListener("storage", handleStorageEvent);
		};
	}, []);

	if (!cart) {
		return <div>No cart found</div>;
	}

	const dishes = cart.items.map((item: CartItem) => {
		return {
			dish: getDishInfoByIdAndTimestamp(
				item.dishId,
				item.uploadTimestamp,
			) as DishProps,
			timestamp: item.uploadTimestamp,
		};
	});

	const handleDeleteCart = () => {
		deleteCart(cart.name);
		setCart(null);
	};

	const handleRemoveDish = (dishId: number, timestamp: string) => {
		removeDishFromCart(cart.name, dishId, timestamp);
		setCart(getCartByName("My Cart"));
	};

	return (
		<div>
			<div className="items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words">
				{cart.name} ({dishes.length})
				<button
					onClick={handleDeleteCart}
					className="btn btn-warning btn-xs l-2"
				>
					Delete All
				</button>
			</div>
			<ul>
				{dishes.map((dish, index) => (
					<li
						key={index}
						className="items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words"
					>
						<div>
							<h1 className="text-xl font-semibold accent-content">
								{dish.dish?.info?.textTranslation}
							</h1>
							<p className="text-neutral-content italic">
								{dish.dish?.info?.text}
							</p>
						</div>
						<button
							onClick={() => handleRemoveDish(dish.dish.id, dish.timestamp)}
							className="text-red-500 underline ml-2"
						>
							Delete
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};

export default CartView;
