/**
 * Auth paths for full-spectrum QA — manual MFA storageState only.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const QA_AUTH_DIR = resolve(process.cwd(), ".auth");
export const QA_HUB_STORAGE_STATE = resolve(QA_AUTH_DIR, "qa-hub-user.json");

/** Prefer dedicated QA state; fall back to D1.8.1 local capture state if present. */
export function resolveHubStorageState(): string | null {
  const candidates = [
    QA_HUB_STORAGE_STATE,
    resolve(QA_AUTH_DIR, "d181-local-user.json"),
    resolve(QA_AUTH_DIR, "d17-review-user.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function hubAuthAvailable(): boolean {
  return resolveHubStorageState() !== null;
}
