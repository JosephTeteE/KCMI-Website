import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_LINK_INVALID_PATH,
  AUTH_SET_PASSWORD_PATH,
  safeAuthNextPath,
} from "@/lib/auth/confirm-redirect";
import { requireSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

const PASSWORD_SETUP_TYPES = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "signup",
  "email",
]);

function defaultNextForType(type: EmailOtpType | null): string {
  if (type && PASSWORD_SETUP_TYPES.has(type)) {
    return AUTH_SET_PASSWORD_PATH;
  }
  return AUTH_SET_PASSWORD_PATH;
}

/**
 * SSR email confirmation: exchange token_hash (or PKCE code) for a cookie session
 * attached to the redirect response, then send invite/recovery users to Set Password.
 * Does not log tokens.
 *
 * Cookie pattern follows @supabase/ssr route-handler guidance: setAll must write
 * onto the NextResponse used for the redirect (not only next/headers cookies()).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeAuthNextPath(
    searchParams.get("next") ?? defaultNextForType(type),
  );

  const failUrl = new URL(AUTH_LINK_INVALID_PATH, origin);
  const successUrl = new URL(next, origin);

  let redirectResponse = NextResponse.redirect(successUrl);

  try {
    const { url, publishableKey } = requireSupabasePublicConfig();
    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          redirectResponse = NextResponse.redirect(successUrl);
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) {
        return NextResponse.redirect(failUrl);
      }
      return redirectResponse;
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(failUrl);
      }
      return redirectResponse;
    }
  } catch {
    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(failUrl);
}
