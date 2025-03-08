import { useMenuV2 } from "@/contexts/MenuV2Context";
import { useTheme } from "@/contexts/ThemeContext";
import { truncateText } from "@/utils/truncateText";
import React from "react";

interface OrderPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ isOpen, onClose }) => {
	const { theme, isDark } = useTheme();
	const { orderItems, updateOrderQuantity, removeFromOrder, clearOrder } =
		useMenuV2();

	// Calculate total items
	const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<div
			className={`
        fixed top-0 right-0 h-full w-80 md:w-96 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
        ${isDark ? "bg-slate-800 text-white" : "bg-white text-slate-800"}
        shadow-2xl
      `}
		>
			{/* Header */}
			<div
				className={`
        p-4 border-b flex justify-between items-center
        ${isDark ? "border-slate-700" : "border-gray-200"}
      `}
			>
				<h2 className="text-xl font-semibold flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 mr-2"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Order Items
					{totalItems > 0 && (
						<span
							className={`
              ml-2 px-2 py-0.5 text-sm rounded-full
              ${isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}
            `}
						>
							{totalItems}
						</span>
					)}
				</h2>
				<button
					onClick={onClose}
					className={`
            p-2 rounded-full hover:bg-opacity-10
            ${isDark ? "hover:bg-white" : "hover:bg-slate-200"}
          `}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
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

			{/* Order Items */}
			<div className="overflow-y-auto h-[calc(100%-8rem)]">
				{orderItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full p-4 text-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-16 w-16 mb-4 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1}
								d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						<p className="text-lg font-medium">Your order is empty</p>
						<p
							className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
						>
							Add items by clicking on dishes in the menu
						</p>
					</div>
				) : (
					<div className="p-4 space-y-4">
						{orderItems.map((item) => (
							<div
								key={item.dish.id}
								className={`
                  p-3 rounded-lg flex items-center justify-between
                  ${isDark ? "bg-slate-700" : "bg-slate-100"}
                `}
							>
								<div className="flex-1 min-w-0">
									<h3 className="font-medium truncate">
										{item.dish.info.textTranslation || item.dish.info.text}
									</h3>
									{item.dish.info.textTranslation &&
										item.dish.info.text &&
										item.dish.info.textTranslation !== item.dish.info.text && (
											<p
												className={`text-xs italic truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
											>
												{truncateText(item.dish.info.text, 30)}
											</p>
										)}
								</div>

								<div className="flex items-center ml-4">
									<button
										onClick={() =>
											updateOrderQuantity(item.dish.id, item.quantity - 1)
										}
										className={`
                      w-8 h-8 flex items-center justify-center rounded-full
                      ${isDark ? "bg-slate-600 hover:bg-slate-500" : "bg-white hover:bg-gray-200"} 
                      ${isDark ? "text-white" : "text-slate-700"}
                      shadow
                    `}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M20 12H4"
											/>
										</svg>
									</button>

									<span
										className={`mx-2 w-6 text-center ${theme === "dark" ? "text-white" : "text-slate-800"}`}
									>
										{item.quantity}
									</span>

									<button
										onClick={() =>
											updateOrderQuantity(item.dish.id, item.quantity + 1)
										}
										className={`
                      w-8 h-8 flex items-center justify-center rounded-full
                      ${isDark ? "bg-slate-600 hover:bg-slate-500" : "bg-white hover:bg-gray-200"} 
                      ${isDark ? "text-white" : "text-slate-700"}
                      shadow
                    `}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 4v16m8-8H4"
											/>
										</svg>
									</button>

									<button
										onClick={() => removeFromOrder(item.dish.id)}
										className={`
                      ml-2 w-8 h-8 flex items-center justify-center rounded-full
                      ${isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}
                      text-white shadow
                    `}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
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
							</div>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<div
				className={`
        absolute bottom-0 left-0 right-0 p-4 border-t
        ${isDark ? "border-slate-700" : "border-gray-200"}
      `}
			>
				<div className="flex justify-between mb-4">
					<span className="font-medium">Total Items:</span>
					<span>{totalItems}</span>
				</div>

				<div className="flex space-x-2">
					<button
						onClick={clearOrder}
						className={`
              flex-1 py-2 rounded-lg font-medium transition-colors
              ${orderItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
              ${
								isDark
									? "bg-slate-700 hover:bg-slate-600 text-white"
									: "bg-slate-200 hover:bg-slate-300 text-slate-800"
							}
            `}
						disabled={orderItems.length === 0}
					>
						Clear All
					</button>

					<button
						className={`
              flex-1 py-2 rounded-lg font-medium transition-colors
              ${orderItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
              ${
								isDark
									? "bg-blue-600 hover:bg-blue-700 text-white"
									: "bg-blue-500 hover:bg-blue-600 text-white"
							}
            `}
						disabled={orderItems.length === 0}
					>
						Checkout
					</button>
				</div>
			</div>
		</div>
	);
};

export default OrderPanel;
