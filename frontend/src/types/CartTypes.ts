export interface CartItem {
	dishId: number;
	uploadTimestamp: string;
}

export interface Cart {
	name: string;
	items: CartItem[];
}
