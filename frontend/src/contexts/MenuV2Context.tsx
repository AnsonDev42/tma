import { DishProps } from "@/types/DishProps.tsx";
import { UploadProps } from "@/types/UploadProps.ts";
import { useUploadsState } from "@/utils/hooks/useUploadsState.ts";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { toast } from "sonner";

interface MenuV2ContextType {
	// Image viewer state
	selectedImage: UploadProps | null;
	dishes: DishProps[];
	hoveredDish: number | null;
	selectedDish: number | null;

	// Order panel state
	orderItems: { dish: DishProps; quantity: number }[];

	// Actions
	setSelectedImage: (upload: UploadProps) => void;
	setDishes: (dishes: DishProps[]) => void;
	setHoveredDish: (id: number | null) => void;
	setSelectedDish: (id: number | null) => void;
	addToOrder: (dish: DishProps) => void;
	removeFromOrder: (dishId: number) => void;
	updateOrderQuantity: (dishId: number, quantity: number) => void;
	clearOrder: () => void;
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
	const [selectedImage, setSelectedImage] = useState<UploadProps | null>(null);
	const [dishes, setDishes] = useState<DishProps[]>([]);
	const [hoveredDish, setHoveredDish] = useState<number | null>(null);
	const [selectedDish, setSelectedDish] = useState<number | null>(null);
	const [orderItems, setOrderItems] = useState<
		{ dish: DishProps; quantity: number }[]
	>([]);

	// Initialize with the latest upload if available
	useEffect(() => {
		if (uploads.length > 0 && !selectedImage) {
			const latestUpload = uploads[uploads.length - 1];
			setSelectedImage(latestUpload);
			setDishes(latestUpload.data);
		}
	}, [uploads, selectedImage]);

	// Update dishes when selected image changes
	useEffect(() => {
		if (selectedImage) {
			setDishes(selectedImage.data);
		}
	}, [selectedImage]);

	const addToOrder = (dish: DishProps) => {
		setOrderItems((prevItems) => {
			const existingItem = prevItems.find((item) => item.dish.id === dish.id);
			if (existingItem) {
				toast.success(
					`Added another ${dish.info.textTranslation || dish.info.text} to order`,
					{
						description: `Quantity: ${existingItem.quantity + 1}`,
						duration: 2000,
					},
				);
				return prevItems.map((item) =>
					item.dish.id === dish.id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				);
			} else {
				toast.success(
					`Added ${dish.info.textTranslation || dish.info.text} to order`,
					{
						description: "Quantity: 1",
						duration: 2000,
					},
				);
				return [...prevItems, { dish, quantity: 1 }];
			}
		});
	};

	const removeFromOrder = (dishId: number) => {
		const itemToRemove = orderItems.find((item) => item.dish.id === dishId);
		if (itemToRemove) {
			toast.info(
				`Removed ${itemToRemove.dish.info.textTranslation || itemToRemove.dish.info.text} from order`,
				{
					duration: 2000,
				},
			);
		}
		setOrderItems((prevItems) =>
			prevItems.filter((item) => item.dish.id !== dishId),
		);
	};

	const updateOrderQuantity = (dishId: number, quantity: number) => {
		if (quantity <= 0) {
			removeFromOrder(dishId);
			return;
		}

		setOrderItems((prevItems) =>
			prevItems.map((item) =>
				item.dish.id === dishId ? { ...item, quantity } : item,
			),
		);
	};

	const clearOrder = () => {
		if (orderItems.length > 0) {
			toast.info("Order cleared", {
				duration: 2000,
			});
		}
		setOrderItems([]);
	};

	const value = {
		selectedImage,
		dishes,
		hoveredDish,
		selectedDish,
		orderItems,
		setSelectedImage,
		setDishes,
		setHoveredDish,
		setSelectedDish,
		addToOrder,
		removeFromOrder,
		updateOrderQuantity,
		clearOrder,
	};

	return (
		<MenuV2Context.Provider value={value}>{children}</MenuV2Context.Provider>
	);
};
