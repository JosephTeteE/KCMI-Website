/**
 * npm run qa:auth — headed MFA, save storageState under platform/.auth/
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE =
  process.env.E2E_BASE_URL?.replace(/\/$/, "") ||
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") ||
  "https://kcmi-preview.josephtete.com";
const AUTH = resolve(ROOT, ".auth/qa-hub-user.json");

if (/kcmi-rcc\.org/i.test(BASE)) {
  console.error("Refusing qa:auth against production hostname.");
  process.exit(1);
}

await ensureCaptureAuthState({
  baseUrl: BASE,
  authStatePath: AUTH,
});

console.log("QA Hub auth ready (path omitted beyond .auth/qa-hub-user.json).");
