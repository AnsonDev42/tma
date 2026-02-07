/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DEBUG_TOOLS?: string;
	readonly VITE_E2E_AUTH_BYPASS?: string;
	readonly VITE_SUPABASE_URL?: string;
	readonly VITE_SUPABASE_PUBLIC_ANON_KEY?: string;
	readonly VITE_PUBLIC_POSTHOG_KEY?: string;
	readonly VITE_PUBLIC_POSTHOG_HOST?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
