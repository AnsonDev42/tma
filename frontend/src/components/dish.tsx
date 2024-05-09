import axios from "axios";

export type DishProps = {
	id: number;
	boundingBox: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	info: {
		text: string;
		imgSrc: string | null;
		description: string;
	};
};
export const demoData: DishProps[] = [
	{
		id: 1,
		boundingBox: {
			x: 0.21081349206349206,
			y: 0.10152116402116403,
			w: 0.33606150793650796,
			h: 0.054563492063492064,
		},
		info: {
			text: "FATTO TIRAMASU",
			imgSrc:
				"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Dolce_%26_Gabbana_Store_%2851396804775%29.jpg/60px-Dolce_%26_Gabbana_Store_%2851396804775%29.jpg",
			description: `Tiramisu (Italian: tiramisù) is an Italian dessert made of
        ladyfinger pastries (savoiardi) dipped in coffee, layered with a
        whipped mixture of eggs, sugar and mascarpone and flavoured with cocoa.`,
		},
	},
	{
		id: 2,
		boundingBox: {
			x: 0.2829861111111111,
			y: 0.16666666666666666,
			w: 0.19146825396825398,
			h: 0.036375661375661374,
		},
		info: {
			text: "Pizzeria",
			imgSrc:
				"https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Old_Pizzeria_-_Napoli.jpg/60px-Old_Pizzeria_-_Napoli.jpg",
			description: `Scugnizzielli is a term often used in Naples, Italy, to refer to
        street food or small, typically savory, snacks. When filled with Nutella,
        it indicates that these bites are filled with the popular hazelnut
        chocolate spread. So, it would likely refer to a dessert or pastry made
        with Nutella filling.`,
		},
	},
];

export function formatResponseData(results: DishProps[]) {
	return results
		.map((item) => {
			const { x, y, w, h } = item.boundingBox || {};
			return {
				id: item.id,
				boundingBox: { x, y, w, h },
				info: {
					text: item.info.text,
					imgSrc: item.info.imgSrc || null,
					description: item.info.description,
				},
			};
		})
		.filter((item) => item !== null) as DishProps[];
}

export async function uploadData(
	formData: FormData,
	setData: React.Dispatch<React.SetStateAction<DishProps[]>>,
) {
	try {
		const response = await axios.post("http://localhost:8000/test", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});

		console.log(response.data);
		const formattedData = formatResponseData(response.data.results);
		if (formattedData.length > 0) {
			setData(formattedData);
			console.log(formattedData);
			alert("Sent successfully");
		} else {
			console.error("No valid data received.");
			alert("No valid data to display.");
		}
	} catch (error) {
		console.error("Failed to send:", (error as string) || "No response");
		alert("Failed to send: " + ((error as string) || "Unknown error"));
	}
}
