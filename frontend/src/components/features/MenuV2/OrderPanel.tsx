import { useMenuV2 } from "@/contexts/MenuV2Context";
import { useTheme } from "@/contexts/ThemeContext";
import { truncateText } from "@/utils/truncateText";
import React from "react";

interface OrderPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ isOpen, onClose }) => {
	const { isDark } = useTheme();
	const { orderItems, updateOrderQuantity, removeFromOrder, clearOrder } =
		useMenuV2();

	const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<div
			className={`fixed right-0 top-0 z-[60] h-full w-[min(100vw,24rem)] transform border-l shadow-2xl transition-transform duration-300 ${
				isOpen ? "translate-x-0" : "translate-x-full"
			} ${
				isDark
					? "border-slate-800 bg-slate-950 text-slate-100"
					: "border-slate-200 bg-white text-slate-900"
			}`}
		>
			<div
				className={`flex items-center justify-between border-b px-4 py-3 ${
					isDark ? "border-slate-800" : "border-slate-200"
				}`}
			>
				<h2 className="flex items-center gap-2 text-lg font-semibold">
					Order
					<span
						className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
							isDark
								? "bg-slate-800 text-slate-300"
								: "bg-slate-100 text-slate-600"
						}`}
					>
						{totalItems}
					</span>
				</h2>
				<button
					type="button"
					onClick={onClose}
					className={`rounded-full p-1.5 ${
						isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
					}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						className="h-5 w-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div className="h-[calc(100%-9.5rem)] overflow-y-auto p-4">
				{orderItems.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<p className="text-lg font-semibold">Your order is empty</p>
						<p className="mt-1 text-sm text-slate-500">
							Add dishes from the list to build an order.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{orderItems.map((item) => (
							<div
								key={item.dish.id}
								className={`rounded-xl border p-3 ${
									isDark
										? "border-slate-800 bg-slate-900"
										: "border-slate-200 bg-slate-50"
								}`}
							>
								<div className="mb-2">
									<p className="text-sm font-semibold">
										{item.dish.info.textTranslation || item.dish.info.text}
									</p>
									{item.dish.info.textTranslation &&
										item.dish.info.text &&
										item.dish.info.textTranslation !== item.dish.info.text && (
											<p className="text-xs italic text-slate-500">
												{truncateText(item.dish.info.text, 36)}
											</p>
										)}
								</div>

								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() =>
												updateOrderQuantity(item.dish.id, item.quantity - 1)
											}
											className={`rounded-md px-2 py-1 text-sm ${
												isDark
													? "bg-slate-800 hover:bg-slate-700"
													: "bg-white hover:bg-slate-100"
											}`}
										>
											-
										</button>
										<span className="w-6 text-center text-sm">
											{item.quantity}
										</span>
										<button
											type="button"
											onClick={() =>
												updateOrderQuantity(item.dish.id, item.quantity + 1)
											}
											className={`rounded-md px-2 py-1 text-sm ${
												isDark
													? "bg-slate-800 hover:bg-slate-700"
													: "bg-white hover:bg-slate-100"
											}`}
										>
											+
										</button>
									</div>
									<button
										type="button"
										onClick={() => removeFromOrder(item.dish.id)}
										className="rounded-md bg-rose-500 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-600"
									>
										Remove
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div
				className={`absolute bottom-0 left-0 right-0 border-t p-4 ${
					isDark ? "border-slate-800" : "border-slate-200"
				}`}
			>
				<div className="mb-3 flex items-center justify-between text-sm">
					<span>Total items</span>
					<span className="font-semibold">{totalItems}</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={clearOrder}
						disabled={orderItems.length === 0}
						className={`rounded-lg px-3 py-2 text-sm font-semibold ${
							orderItems.length === 0
								? "cursor-not-allowed opacity-50"
								: isDark
									? "bg-slate-800 hover:bg-slate-700"
									: "bg-slate-100 hover:bg-slate-200"
						}`}
					>
						Clear
					</button>
					<button
						type="button"
						disabled={orderItems.length === 0}
						className={`rounded-lg px-3 py-2 text-sm font-semibold ${
							orderItems.length === 0
								? "cursor-not-allowed opacity-50"
								: "bg-teal-600 text-white hover:bg-teal-500"
						}`}
					>
						Checkout
					</button>
				</div>
			</div>
		</div>
	);
};

export default OrderPanel;
