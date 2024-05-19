import { Language, LanguageProvider } from "@/contexts/LanguageContext.tsx";
import { SessionProvider } from "@/contexts/SessionContext.tsx";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

const initialLanguage: Language = { value: "en", label: "English" };

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<SessionProvider>
			<LanguageProvider initialLanguage={initialLanguage}>
				<App />
			</LanguageProvider>
		</SessionProvider>
	</React.StrictMode>,
);
