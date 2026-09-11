/**
 * Delete local D1.7 review storageState (authenticated session).
 * Does not touch hosted Auth or CMS.
 */
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = resolve(ROOT, ".auth/d17-review-user.json");

if (existsSync(TARGET)) {
  rmSync(TARGET);
  console.log("Removed .auth/d17-review-user.json");
} else {
  console.log("No .auth/d17-review-user.json present");
}
