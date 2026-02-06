import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import React, {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from "react";
import { toast } from "sonner";

export type MenuViewMode = "balanced" | "list-focus";

type OrderItem = {
	dish: DishProps;
	quantity: number;
};

interface MenuState {
	selectedImage: UploadProps | null;
	dishes: DishProps[];
	hoveredDish: number | null;
	selectedDish: number | null;
	locationPreviewDishId: number | null;
	orderItems: OrderItem[];
	viewMode: MenuViewMode;
}

type MenuAction =
	| { type: "SET_SELECTED_IMAGE"; payload: UploadProps | null }
	| { type: "SET_DISHES"; payload: DishProps[] }
	| { type: "SET_HOVERED_DISH"; payload: number | null }
	| { type: "SET_SELECTED_DISH"; payload: number | null }
	| { type: "SET_LOCATION_PREVIEW_DISH_ID"; payload: number | null }
	| { type: "ADD_TO_ORDER"; payload: DishProps }
	| { type: "REMOVE_FROM_ORDER"; payload: number }
	| {
			type: "UPDATE_ORDER_QUANTITY";
			payload: { dishId: number; quantity: number };
	  }
	| { type: "CLEAR_ORDER" }
	| { type: "SET_VIEW_MODE"; payload: MenuViewMode };

interface MenuV2ContextType extends MenuState {
	setSelectedImage: (upload: UploadProps | null) => void;
	setDishes: (dishes: DishProps[]) => void;
	setHoveredDish: (id: number | null) => void;
	setSelectedDish: (id: number | null) => void;
	setLocationPreviewDishId: (id: number | null) => void;
	setViewMode: (mode: MenuViewMode) => void;
	addToOrder: (dish: DishProps) => void;
	removeFromOrder: (dishId: number) => void;
	updateOrderQuantity: (dishId: number, quantity: number) => void;
	clearOrder: () => void;
}

const initialState: MenuState = {
	selectedImage: null,
	dishes: [],
	hoveredDish: null,
	selectedDish: null,
	locationPreviewDishId: null,
	orderItems: [],
	viewMode: "balanced",
};

function menuReducer(state: MenuState, action: MenuAction): MenuState {
	switch (action.type) {
		case "SET_SELECTED_IMAGE": {
			if (!action.payload) {
				return {
					...state,
					selectedImage: null,
					dishes: [],
					hoveredDish: null,
					selectedDish: null,
					locationPreviewDishId: null,
				};
			}

			return {
				...state,
				selectedImage: action.payload,
				dishes: action.payload.data,
				hoveredDish: null,
				selectedDish: null,
				locationPreviewDishId: null,
			};
		}
		case "SET_DISHES": {
			const currentDishStillValid = action.payload.some(
				(dish) => dish.id === state.selectedDish,
			);

			return {
				...state,
				dishes: action.payload,
				selectedDish: currentDishStillValid ? state.selectedDish : null,
				locationPreviewDishId: action.payload.some(
					(dish) => dish.id === state.locationPreviewDishId,
				)
					? state.locationPreviewDishId
					: null,
				selectedImage: state.selectedImage
					? { ...state.selectedImage, data: action.payload }
					: null,
			};
		}
		case "SET_HOVERED_DISH":
			return { ...state, hoveredDish: action.payload };
		case "SET_SELECTED_DISH":
			return { ...state, selectedDish: action.payload };
		case "SET_LOCATION_PREVIEW_DISH_ID":
			return { ...state, locationPreviewDishId: action.payload };
		case "SET_VIEW_MODE":
			return { ...state, viewMode: action.payload };
		case "ADD_TO_ORDER": {
			const existingItem = state.orderItems.find(
				(item) => item.dish.id === action.payload.id,
			);

			if (existingItem) {
				return {
					...state,
					orderItems: state.orderItems.map((item) =>
						item.dish.id === action.payload.id
							? { ...item, quantity: item.quantity + 1 }
							: item,
					),
				};
			}

			return {
				...state,
				orderItems: [
					...state.orderItems,
					{ dish: action.payload, quantity: 1 },
				],
			};
		}
		case "REMOVE_FROM_ORDER":
			return {
				...state,
				orderItems: state.orderItems.filter(
					(item) => item.dish.id !== action.payload,
				),
			};
		case "UPDATE_ORDER_QUANTITY":
			return {
				...state,
				orderItems: state.orderItems.map((item) =>
					item.dish.id === action.payload.dishId
						? { ...item, quantity: action.payload.quantity }
						: item,
				),
			};
		case "CLEAR_ORDER":
			return {
				...state,
				orderItems: [],
			};
		default:
			return state;
	}
}

const MenuV2Context = createContext<MenuV2ContextType | undefined>(undefined);

export const useMenuV2 = () => {
	const context = useContext(MenuV2Context);
	if (!context) {
		throw new Error("useMenuV2 must be used within a MenuV2Provider");
	}
	return context;
};

interface MenuV2ProviderProps {
	children: ReactNode;
}

export const MenuV2Provider: React.FC<MenuV2ProviderProps> = ({ children }) => {
	const { uploads } = useUploadsState();
	const [state, dispatch] = useReducer(menuReducer, initialState);

	useEffect(() => {
		if (uploads.length === 0 || state.selectedImage) {
			return;
		}

		const latestUpload = uploads[uploads.length - 1];
		dispatch({ type: "SET_SELECTED_IMAGE", payload: latestUpload });
	}, [uploads, state.selectedImage]);

	const setSelectedImage = useCallback((upload: UploadProps | null) => {
		dispatch({ type: "SET_SELECTED_IMAGE", payload: upload });
	}, []);

	const setDishes = useCallback((dishes: DishProps[]) => {
		dispatch({ type: "SET_DISHES", payload: dishes });
	}, []);

	const setHoveredDish = useCallback((id: number | null) => {
		dispatch({ type: "SET_HOVERED_DISH", payload: id });
	}, []);

	const setSelectedDish = useCallback((id: number | null) => {
		dispatch({ type: "SET_SELECTED_DISH", payload: id });
	}, []);

	const setLocationPreviewDishId = useCallback((id: number | null) => {
		dispatch({ type: "SET_LOCATION_PREVIEW_DISH_ID", payload: id });
	}, []);

	const setViewMode = useCallback((mode: MenuViewMode) => {
		dispatch({ type: "SET_VIEW_MODE", payload: mode });
	}, []);

	const addToOrder = useCallback(
		(dish: DishProps) => {
			const existingItem = state.orderItems.find(
				(item) => item.dish.id === dish.id,
			);
			dispatch({ type: "ADD_TO_ORDER", payload: dish });

			if (existingItem) {
				toast.success(
					`Added another ${dish.info.textTranslation || dish.info.text} to order`,
					{
						description: `Quantity: ${existingItem.quantity + 1}`,
						duration: 2000,
					},
				);
				return;
			}

			toast.success(
				`Added ${dish.info.textTranslation || dish.info.text} to order`,
				{
					description: "Quantity: 1",
					duration: 2000,
				},
			);
		},
		[state.orderItems],
	);

	const removeFromOrder = useCallback(
		(dishId: number) => {
			const itemToRemove = state.orderItems.find(
				(item) => item.dish.id === dishId,
			);
			if (itemToRemove) {
				toast.info(
					`Removed ${itemToRemove.dish.info.textTranslation || itemToRemove.dish.info.text} from order`,
					{ duration: 2000 },
				);
			}
			dispatch({ type: "REMOVE_FROM_ORDER", payload: dishId });
		},
		[state.orderItems],
	);

	const updateOrderQuantity = useCallback(
		(dishId: number, quantity: number) => {
			if (quantity <= 0) {
				removeFromOrder(dishId);
				return;
			}

			dispatch({
				type: "UPDATE_ORDER_QUANTITY",
				payload: { dishId, quantity },
			});
		},
		[removeFromOrder],
	);

	const clearOrder = useCallback(() => {
		if (state.orderItems.length > 0) {
			toast.info("Order cleared", { duration: 2000 });
		}
		dispatch({ type: "CLEAR_ORDER" });
	}, [state.orderItems.length]);

	const value = useMemo(
		() => ({
			...state,
			setSelectedImage,
			setDishes,
			setHoveredDish,
			setSelectedDish,
			setLocationPreviewDishId,
			setViewMode,
			addToOrder,
			removeFromOrder,
			updateOrderQuantity,
			clearOrder,
		}),
		[
			state,
			setSelectedImage,
			setDishes,
			setHoveredDish,
			setSelectedDish,
			setLocationPreviewDishId,
			setViewMode,
			addToOrder,
			removeFromOrder,
			updateOrderQuantity,
			clearOrder,
		],
	);

	return (
		<MenuV2Context.Provider value={value}>{children}</MenuV2Context.Provider>
	);
};
