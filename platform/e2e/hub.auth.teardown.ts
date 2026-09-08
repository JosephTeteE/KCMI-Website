import { test as teardown } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanupSyntheticRecords } from "./helpers/hub";

teardown("remove Hub visual staff user", async () => {
  const metaPath = resolve(process.cwd(), "e2e/.auth/staff-user.json");
  if (!existsSync(metaPath)) return;
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { id?: string };
  if (meta.id) await cleanupSyntheticRecords({ userIds: [meta.id] });
});
