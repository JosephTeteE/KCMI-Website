import { expect, test } from "@playwright/test";
import { hasHubEnv } from "./helpers/env";
import { ACCRA_BRANCH_ID } from "./helpers/hub";

const HUB_SCREENS = [
  { name: "dashboard", path: "/admin" },
  { name: "programs", path: "/admin/programs" },
  { name: "program-editor", path: "/admin/programs/new" },
  { name: "media", path: "/admin/media" },
  { name: "branch-editor", path: `/admin/branches/${ACCRA_BRANCH_ID}` },
  { name: "livestream", path: "/admin/livestream" },
] as const;

const HUB_VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 800 },
] as const;

test.describe("Hub visual baselines @visual", () => {
  test.beforeEach(() => {
    test.skip(!hasHubEnv(), "Local Supabase env is not configured");
  });

  for (const screen of HUB_SCREENS) {
    for (const viewport of HUB_VIEWPORTS) {
      test(`${screen.name} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(screen.path, { waitUntil: "networkidle" });
        await expect(page.getByText("KCMI Hub")).toBeVisible();
        await expect(page).toHaveScreenshot({ fullPage: true });
      });
    }
  }
});
