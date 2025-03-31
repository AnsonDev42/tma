import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error(
		"Missing Supabase environment variables. Check your .env file.",
	);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
