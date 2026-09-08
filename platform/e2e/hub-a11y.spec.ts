import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { hasHubEnv } from "./helpers/env";

test.describe("Hub accessibility sanity", () => {
  test("axe dashboard + programs", async ({ page }) => {
    test.skip(!hasHubEnv(), "Local Supabase env is not configured");
    for (const path of ["/admin", "/admin/programs"] as const) {
      await page.goto(path, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(serious, `${path} ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });
});
