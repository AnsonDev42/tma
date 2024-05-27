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
				<div className="items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words">
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
					<li
						key={index}
						className=" items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words"
					>
						<div>
							<h1 className="text-xl font-semibold text-gray-900">
								{dish.dish?.info?.textTranslation}
							</h1>
							<p className="text-gray-500 italic">{dish.dish?.info?.text}</p>
						</div>
						<button
							onClick={() =>
								removeDishFromCart(cart.name, dish.dish.id, dish.timestamp)
							}
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
