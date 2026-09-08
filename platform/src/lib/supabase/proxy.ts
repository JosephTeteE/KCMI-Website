import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isHostedKcmiEnvironment } from "@/lib/env";

/**
 * Refresh the Auth session for Server Components / browser cookies.
 * Hostname routing remains in next.config rewrites — not here.
 * Authorization for /admin remains in server layouts + RLS — not here.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    if (isHostedKcmiEnvironment()) {
      throw new Error(
        url
          ? "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
          : "Missing NEXT_PUBLIC_SUPABASE_URL",
      );
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  // getClaims() validates the JWT signature (preferred over trusting cookies alone).
  await supabase.auth.getClaims();

  return supabaseResponse;
}
