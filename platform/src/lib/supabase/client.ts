import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/** Browser Supabase client — publishable key only. Never use the secret key here. */
export function createClient() {
  const { url, publishableKey } = requireSupabasePublicConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
