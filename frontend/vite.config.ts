import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		cors: false,
	},
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		"process.env": {
			uploadMenuData: "https://api.itsya0wen.com/upload",
			googleSearchUrl: "https://www.google.com/search?q=",
			wikipediaUrl: "https://wikipedia.org/wiki/",
		},
	},
});
