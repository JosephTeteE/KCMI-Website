/**
 * npm run qa:trace — open a local Playwright trace (never packages it).
 * Usage: npm run qa:trace -- path/to/trace.zip
 */
import { spawnSync } from "node:child_process";

const target = process.argv[2];
if (!target) {
  console.error("Usage: npm run qa:trace -- <path-to-trace.zip>");
  console.error("Authenticated traces are LOCAL-SENSITIVE — do not share ZIPs containing them.");
  process.exit(1);
}
const r = spawnSync("npx", ["playwright", "show-trace", target], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
