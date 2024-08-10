import { GlobalDishCard } from "@/components/features/Dish/GlobalDishCard";
import { ShowTextState } from "@/components/features/Menu/Menu";
import { useCart } from "@/utils/hooks/useCart.ts";
import React from "react";
const CartView: React.FC = () => {
	const { cart, dishes, deleteCurrentCart, removeDish } = useCart("My Cart");
	const [_openModal, setOpenModal] = React.useState<boolean>(false);

	if (!cart) {
		return <div>No cart found. Add any dish in dish card to get started!</div>;
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
							<GlobalDishCard
								dish={dish.dish}
								timeStamp={dish.timestamp}
								showTextState={ShowTextState.SHOW_BOTH}
								isCartView={1}
								setOpenModal={setOpenModal}
							/>
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
