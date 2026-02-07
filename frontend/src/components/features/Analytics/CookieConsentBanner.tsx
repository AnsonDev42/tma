import "@/styles/cookieConsent.css";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";

const ANALYTICS_CATEGORY = "analytics";
let hasInitializedCookieConsent = false;

const CookieConsentBanner = () => {
	const posthog = usePostHog();

	useEffect(() => {
		const syncAnalyticsConsent = () => {
			if (CookieConsent.acceptedCategory(ANALYTICS_CATEGORY)) {
				posthog.opt_in_capturing();
				return;
			}

			posthog.opt_out_capturing();
		};

		if (hasInitializedCookieConsent) {
			syncAnalyticsConsent();
			return;
		}

		hasInitializedCookieConsent = true;

		void CookieConsent.run({
			mode: "opt-in",
			autoClearCookies: true,
			guiOptions: {
				consentModal: {
					layout: "box wide",
					position: "bottom right",
					equalWeightButtons: false,
				},
				preferencesModal: {
					layout: "box",
					equalWeightButtons: false,
				},
			},
			cookie: {
				name: "tma_cookie_preferences",
				expiresAfterDays: 180,
				sameSite: "Lax",
			},
			categories: {
				necessary: {
					enabled: true,
					readOnly: true,
				},
				analytics: {
					autoClear: {
						cookies: [{ name: /^ph_.+/ }],
					},
				},
			},
			language: {
				default: "en",
				translations: {
					en: {
						consentModal: {
							title: "Use cookies for analytics?",
							description:
								"We use PostHog to understand product usage and improve TMA. You can accept analytics cookies or keep only required cookies.",
							acceptAllBtn: "Accept all",
							acceptNecessaryBtn: "Necessary only",
							showPreferencesBtn: "Customize",
						},
						preferencesModal: {
							title: "Cookie preferences",
							acceptAllBtn: "Accept all",
							acceptNecessaryBtn: "Reject all",
							savePreferencesBtn: "Save preferences",
							closeIconLabel: "Close",
							sections: [
								{
									title: "How we use cookies",
									description:
										"Necessary cookies keep core flows working. Analytics cookies help us improve reliability, UX, and feature adoption.",
								},
								{
									title: "Strictly necessary",
									description:
										"Required for security and core product behavior. These cookies are always on.",
									linkedCategory: "necessary",
								},
								{
									title: "Analytics",
									description:
										"Allows PostHog analytics so we can measure usage and improve TMA.",
									linkedCategory: "analytics",
								},
							],
						},
					},
				},
			},
			onFirstConsent: syncAnalyticsConsent,
			onConsent: syncAnalyticsConsent,
			onChange: syncAnalyticsConsent,
		});
	}, [posthog]);

	return null;
};

export default CookieConsentBanner;
