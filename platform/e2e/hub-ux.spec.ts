import { expect, test } from "@playwright/test";
import { hasHubEnv } from "./helpers/env";
import {
  ACCRA_BRANCH_ID,
  createSyntheticUser,
  cleanupSyntheticRecords,
  dismissHubTourIfPresent,
  signInStaff,
} from "./helpers/hub";
import { HUB_DASHBOARD_CARDS } from "../src/lib/hub/dashboard-cards";
import { HUB_TOUR_STORAGE_KEY } from "../src/lib/hub/tour";

test.describe("Hub volunteer UX", () => {
  test("dashboard cards, current vs change, and tour skip/replay", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    test.skip(!hasHubEnv(), "Local Supabase env is not configured");

    const stamp = Date.now();
    const email = `d16d.ux.${stamp}@example.invalid`;
    const user = await createSyntheticUser(email, "super_admin");
    let sermonId: string | null = null;

    try {
      await signInStaff(page, email);
      await expect(page.getByRole("heading", { name: "Welcome to the KCMI Hub" })).toBeVisible({
        timeout: 15_000,
      });
      await dismissHubTourIfPresent(page);
      await expect(
        page.getByRole("heading", { name: "What would you like to update?" }),
      ).toBeVisible();

      const completed = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        HUB_TOUR_STORAGE_KEY,
      );
      expect(completed).toBe("true");

      for (const card of HUB_DASHBOARD_CARDS) {
        await expect(
          page.locator("ul.grid").getByRole("link", { name: card.title }),
        ).toHaveAttribute("href", card.href);
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("button", { name: "Open Hub menu" })).toBeVisible();
      await page.getByRole("button", { name: "Open Hub menu" }).click();
      await expect(
        page.getByRole("dialog").getByRole("link", { name: "Dashboard" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      await page.setViewportSize({ width: 1280, height: 720 });

      await page.getByRole("link", { name: "Homepage" }).click();
      await expect(page.getByText("What would you like to change?")).toBeVisible();
      await page.getByRole("button", { name: "Top Banner" }).click();
      await expect(page.getByText("Currently on the website").first()).toBeVisible();
      await expect(page.getByText("Scroll sideways")).toHaveCount(0);
      const bannerPreview = page.getByRole("region", {
        name: "Homepage Top Banner",
      });
      await expect(
        bannerPreview.getByRole("button", { name: "View full-size preview" }),
      ).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        bannerPreview.getByRole("button", { name: "View full-size preview" }),
      ).toBeVisible();
      await expect(page.getByText("Scroll sideways")).toHaveCount(0);
      await bannerPreview
        .getByRole("button", { name: "View full-size preview" })
        .focus();
      await page.keyboard.press("Enter");
      const fullPreview = page.getByRole("dialog");
      await expect(fullPreview).toBeVisible();
      await expect(
        fullPreview.getByText("Homepage Top Banner — full-size preview"),
      ).toBeVisible();
      await expect(fullPreview.getByRole("button", { name: "Close" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(fullPreview).toBeHidden();
      await expect(
        bannerPreview.getByRole("button", { name: "View full-size preview" }),
      ).toBeFocused();
      await page.setViewportSize({ width: 1280, height: 720 });
      const proposed = page.locator("[data-hub-role='proposed']");
      await expect(proposed).toHaveCount(0);
      await page.getByRole("button", { name: "Change this section" }).first().click();
      await expect(page.locator("[data-hub-role='proposed']").first()).toBeVisible();
      await expect(page.getByText("What would you like to show instead?").first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Preview my changes" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Make these changes live" }).first(),
      ).toBeVisible();

      await page.getByRole("button", { name: "All homepage sections" }).click();
      await page.getByRole("button", { name: "Featured Program" }).click();
      await expect(page.getByText("Currently featured")).toBeVisible();
      await expect(page.locator("#proposed-featuredProgramId")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Choose a different featured program" })
        .click();
      await expect(page.locator("#proposed-featuredProgramId")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Preview homepage section" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Make this program live on the homepage" }),
      ).toBeVisible();

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Sermons" }).click();
      await page.getByRole("link", { name: "New sermon" }).click();
      await page.locator("#title").fill(`D1.6D UX sermon ${stamp}`);
      await page.getByRole("button", { name: "Save as a draft (not public yet)" }).click();
      await expect(page).toHaveURL(/\/admin\/sermons\/[0-9a-f-]+/i, { timeout: 20_000 });
      sermonId = page.url().match(/\/admin\/sermons\/([^/?#]+)/)?.[1] ?? null;
      await expect(page.getByText("Current draft").first()).toBeVisible();
      await expect(
        page.getByText("Not visible to website visitors yet").first(),
      ).toBeVisible();
      await expect(page.getByText("Currently on the website")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove from public website" })).toHaveCount(0);
      await expect(page.locator("#title")).toHaveCount(0);
      await page.getByRole("button", { name: "Change these details" }).click();
      await expect(page.locator("#proposed-title")).toHaveValue("");

      await page.goto(`/admin/branches/${ACCRA_BRANCH_ID}`);
      await expect(page.getByText("Currently on the website").first()).toBeVisible();
      await expect(page.getByText("Service times").first()).toBeVisible();
      await expect(page.getByText("Public contact").first()).toBeVisible();
      await expect(page.locator("#city_label")).toHaveCount(0);
      await page.getByRole("button", { name: "Change branch details" }).click();
      await expect(page.locator("#proposed-city")).toHaveValue("");
      await expect(
        page.getByRole("button", { name: "Use current information as my starting point" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Replay Hub Tour" }).click();
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await page.getByRole("button", { name: "Skip tour" }).click();
    } finally {
      await cleanupSyntheticRecords({ userIds: [user.id], sermonId });
    }
  });
});
