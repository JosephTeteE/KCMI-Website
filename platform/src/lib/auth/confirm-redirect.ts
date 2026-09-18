/**
 * Open-redirect-safe `next` resolution for /auth/confirm.
 * Only same-origin relative /auth/* paths are allowed.
 */

export const AUTH_SET_PASSWORD_PATH = "/auth/set-password";
export const AUTH_LINK_INVALID_PATH = "/auth/sign-in?notice=auth-link-invalid";

export function safeAuthNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return AUTH_SET_PASSWORD_PATH;
  }
  const pathOnly = raw.split("?")[0] ?? raw;
  if (!pathOnly.startsWith("/auth/")) {
    return AUTH_SET_PASSWORD_PATH;
  }
  return raw;
}

/** True when a prior URL is a same-origin Hub path (safe for history.back). */
export function isSafeHubHistoryReferrer(
  referrer: string,
  currentOrigin: string,
): boolean {
  if (!referrer || !currentOrigin) return false;
  try {
    const url = new URL(referrer);
    if (url.origin !== currentOrigin) return false;
    return (
      url.pathname === "/admin" ||
      url.pathname.startsWith("/admin/")
    );
  } catch {
    return false;
  }
}
