import { useCart } from "@/utils/hooks/useCart.ts";
import React from "react";

const CartView: React.FC = () => {
	const { cart, dishes, deleteCurrentCart, removeDish } = useCart("My Cart");

	if (!cart) {
		return <div>No cart found</div>;
	}

	return (
		<div>
			<div className="items-start justify-between m-0.5 grid grid-flow-col text-wrap break-words">
				{cart.name} ({dishes.length})
				<button
					onClick={deleteCurrentCart}
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
							<p className="text-base-content italic">
								{dish.dish?.info?.text}
							</p>
						</div>
						<button
							onClick={() => removeDish(dish.dish.id, dish.timestamp)}
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
