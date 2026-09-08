import { createClient } from "@supabase/supabase-js";
import { requireSupabaseSecretConfig } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Privileged secret-key client — SERVER ONLY.
 * Uses SUPABASE_SECRET_KEY (Postgres role service_role, BYPASSRLS).
 * Never import from Client Components. Never use createServerClient/cookies here.
 */
export function createSecretKeyClient() {
  const { url, secretKey } = requireSupabaseSecretConfig();
  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
