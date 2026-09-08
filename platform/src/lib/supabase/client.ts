import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Browser Supabase client — anon key only. Never use service role here. */
export function createClient() {
  const { url, anonKey } = requireSupabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}
