import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	"https://scwodhehztemzcpsofzy.supabase.co",
	"REMOVED",
);

export default supabase;
