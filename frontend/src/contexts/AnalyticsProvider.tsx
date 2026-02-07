import CookieConsentBanner from "@/components/features/Analytics/CookieConsentBanner.tsx";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode } from "react";

type AnalyticsProviderProps = {
	children: ReactNode;
};

const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogApiHost =
	import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
	if (!posthogApiKey) {
		return <>{children}</>;
	}

	return (
		<PostHogProvider
			apiKey={posthogApiKey}
			options={{
				api_host: posthogApiHost,
				capture_pageview: "history_change",
				opt_out_capturing_by_default: true,
			}}
		>
			<CookieConsentBanner />
			{children}
		</PostHogProvider>
	);
};

export default AnalyticsProvider;
