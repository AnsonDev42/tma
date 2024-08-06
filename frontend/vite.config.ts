import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const isProduction = mode === "production";
	const apiUrl = isProduction
		? "https://api.itsya0wen.com"
		: "http://localhost:8000";

	return {
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
			__API_URL__: JSON.stringify(apiUrl),
		},
	};
});
