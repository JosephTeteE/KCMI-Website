/**
 * Auth paths for full-spectrum QA — manual MFA storageState only.
 * Resolves by host convention — does not inspect cookie values.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const QA_AUTH_DIR = resolve(process.cwd(), ".auth");
export const QA_HUB_STORAGE_STATE = resolve(QA_AUTH_DIR, "qa-hub-user.json");

const LOCAL_CANDIDATES = [
  resolve(QA_AUTH_DIR, "d181-local-user.json"),
  resolve(process.cwd(), "e2e/.auth/staff.json"),
  resolve(QA_AUTH_DIR, "qa-hub-user.json"),
  resolve(QA_AUTH_DIR, "d17-review-user.json"),
] as const;

const HOSTED_CANDIDATES = [
  QA_HUB_STORAGE_STATE,
  resolve(QA_AUTH_DIR, "d17-review-user.json"),
  resolve(QA_AUTH_DIR, "d181-local-user.json"),
] as const;

function hostnameFromBaseUrl(baseURL?: string | null): string {
  if (!baseURL) return "";
  try {
    return new URL(baseURL).hostname;
  } catch {
    return "";
  }
}

function isLocalHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/** Prefer dedicated QA state; fall back to D1.8.1 local capture state if present. */
export function resolveHubStorageState(baseURL?: string | null): string | null {
  const host = hostnameFromBaseUrl(baseURL);
  const candidates = isLocalHost(host) ? LOCAL_CANDIDATES : HOSTED_CANDIDATES;
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // No baseURL / unknown host: first existing file across both lists
  for (const p of [...HOSTED_CANDIDATES, ...LOCAL_CANDIDATES]) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function hubAuthAvailable(baseURL?: string | null): boolean {
  return resolveHubStorageState(baseURL) !== null;
}
