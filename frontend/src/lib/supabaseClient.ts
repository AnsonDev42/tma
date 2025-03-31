import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
	import.meta.env.VITE_SUPABASE_URL ||
	"https://scwodhehztemzcpsofzy.supabase.co";
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd29kaGVoenRlbXpjcHNvZnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxMjA3MTksImV4cCI6MjAzMDY5NjcxOX0.j4O3aKoITFoJi36sQiPoh5PUWSDwwDDh02hhmMRF8HY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
