import { DishProps } from "@/types/DishProps.tsx";
import {
	Cart,
	CartItem,
	deleteCart,
	getCartByName,
	getDishInfoByIdAndTimestamp,
	removeDishFromCart,
} from "@/utils/localStorageUtils.ts";
import { useEffect, useState } from "react";

const CartView = () => {
	const [cart, setCart] = useState<Cart | null>(getCartByName("My Cart"));

	useEffect(() => {
		const handleStorageEvent = () => {
			console.log("Storage event detected");
			setCart(getCartByName("My Cart"));
		};

		window.addEventListener("storage", handleStorageEvent);

		return () => {
			window.removeEventListener("storage", handleStorageEvent);
			console.log("Storage event listener removed");
		};
	}, []);

	if (!cart) {
		return <div>No cart found</div>;
	}

	if (!cart) {
		return <div>No cart found</div>;
	}

	//  query the dishes in the cart
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dishes = cart.items.map((item: CartItem): any => {
		return {
			dish: getDishInfoByIdAndTimestamp(
				item.dishId,
				item.uploadTimestamp,
			) as DishProps,
			timestamp: item.uploadTimestamp,
		};
	});

	return (
		<div>
			<ul>
				<div className="flex items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words">
					{cart.name} ({dishes.length})
					<button
						onClick={() => deleteCart(cart.name)}
						className=" btn btn-warning btn-xs l-2"
					>
						Delete All
					</button>
				</div>
				{/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
				{dishes.map((dish: any, index) => (
					<li className="flex items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words">
						<h1 key={index}>{dish.dish?.info?.text}</h1>
						<button
							onClick={() =>
								removeDishFromCart(cart.name, dish.dish.id, dish.timestamp)
							}
							className=" text-red-500 underline ml-2"
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
