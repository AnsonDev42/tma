import { DemoPreset } from "@/features/menu/types";

export const demoPresets: DemoPreset[] = [
	{
		id: "demo-en",
		label: "English Demo",
		description: "Translated names and descriptions in English.",
		languageLabel: "English",
		imageSrc: "/demoMenu1.jpg",
		dataUrl: "/demoDataEN.json",
	},
	{
		id: "demo-zh",
		label: "Chinese Demo",
		description: "Simplified Chinese translation for the same menu image.",
		languageLabel: "简体中文",
		imageSrc: "/demoMenu1.jpg",
		dataUrl: "/demoDataCN.json",
	},
];
