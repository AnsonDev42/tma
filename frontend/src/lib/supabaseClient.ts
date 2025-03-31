import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
	import.meta.env.VITE_SUPABASE_URL ||
	"https://scwodhehztemzcpsofzy.supabase.co";
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	"REMOVED";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
