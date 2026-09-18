import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SET_PASSWORD_PATH = "/auth/set-password";
const SIGN_IN_INVALID_PATH = "/auth/sign-in?notice=auth-link-invalid";

const PASSWORD_SETUP_TYPES = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "signup",
  "email",
]);

/**
 * Only allow same-origin relative /auth/* destinations (open-redirect safe).
 */
function safeAuthNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return SET_PASSWORD_PATH;
  }
  const pathOnly = raw.split("?")[0] ?? raw;
  if (!pathOnly.startsWith("/auth/")) {
    return SET_PASSWORD_PATH;
  }
  return raw;
}

function defaultNextForType(type: EmailOtpType | null): string {
  if (type && PASSWORD_SETUP_TYPES.has(type)) {
    return SET_PASSWORD_PATH;
  }
  return SET_PASSWORD_PATH;
}

/**
 * SSR email confirmation: exchange token_hash (or PKCE code) for a cookie session,
 * then send invite/recovery users to Set Password — never bare sign-in.
 * Does not log tokens.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeAuthNextPath(
    searchParams.get("next") ?? defaultNextForType(type),
  );

  const failUrl = new URL(SIGN_IN_INVALID_PATH, origin);
  const successUrl = new URL(next, origin);

  try {
    const supabase = await createClient();

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) {
        return NextResponse.redirect(failUrl);
      }
      return NextResponse.redirect(successUrl);
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(failUrl);
      }
      return NextResponse.redirect(successUrl);
    }
  } catch {
    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(failUrl);
}
