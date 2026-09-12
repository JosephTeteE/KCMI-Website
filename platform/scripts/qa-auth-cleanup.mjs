/**
 * npm run qa:auth:cleanup — remove local Hub storageState files (not secrets in git).
 */
import { existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  ".auth/qa-hub-user.json",
  ".auth/d181-local-user.json",
  "e2e/.auth/staff.json",
];

for (const rel of targets) {
  const p = resolve(ROOT, rel);
  if (existsSync(p)) {
    rmSync(p);
    console.log(`Removed ${rel}`);
  }
}
console.log("Auth cleanup done. Re-run npm run qa:auth before Hub suites.");
