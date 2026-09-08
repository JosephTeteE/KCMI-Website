import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { hasHubEnv } from "./helpers/env";
import {
  ACCRA_BRANCH_ID,
  TOGO_BRANCH_ID,
  cleanupSyntheticRecords,
  createSyntheticUser,
  serviceClient,
  signInStaff,
} from "./helpers/hub";

const pixel = resolve(process.cwd(), "e2e/fixtures/pixel.png");

test.describe("Hub browser smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("programs, media, branch, sermons, livestream", async ({ page, context }) => {
    test.setTimeout(180_000);
    test.skip(!hasHubEnv(), "Local Supabase env is not configured");

    const stamp = Date.now();
    const publisherEmail = `d12.publisher.${stamp}@example.invalid`;
    const branchEmail = `d12.accra.${stamp}@example.invalid`;
    const programTitle = `D1.2 Browser Program ${stamp}`;
    const sermonTitle = `D1.2 Browser Sermon ${stamp}`;

    const publisher = await createSyntheticUser(publisherEmail, "super_admin");
    const branchUser = await createSyntheticUser(branchEmail, "branch_admin");
    const admin = serviceClient();
    await admin.from("branch_staff_assignments").upsert({
      user_id: branchUser.id,
      branch_id: ACCRA_BRANCH_ID,
    });

    const { data: livestreamBefore } = await admin
      .from("livestream_settings")
      .select("facebook_url, is_live")
      .eq("singleton_key", "default")
      .maybeSingle();

    let programId: string | null = null;
    let sermonId: string | null = null;
    const mediaIds: string[] = [];
    let branchMediaId: string | null = null;

    try {
      await signInStaff(page, publisherEmail);
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
        timeout: 20_000,
      });

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Programs" }).click();
      await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
      await page.getByRole("link", { name: "New program" }).click();
      await page.locator("#title").fill(programTitle);
      await page.locator("#short_description").fill("Synthetic D1.2 program");
      await page.locator("#cta_label").fill("Learn more");
      await page.locator("#cta_url").fill("/events");
      await page.locator("#placement").selectOption("featured");
      await page.getByRole("button", { name: "Create draft" }).click();
      await expect(page.getByText("Draft program created.")).toBeVisible();
      programId = page.url().match(/\/admin\/programs\/([^/?#]+)/)?.[1] ?? null;
      expect(programId).toBeTruthy();

      await page.getByRole("link", { name: "Open Hub preview" }).click();
      await expect(page.getByRole("heading", { name: programTitle })).toBeVisible();
      await page.goBack();

      await page.getByRole("button", { name: "Mark ready for preview" }).click();
      await expect(page.getByText("Marked ready for preview.")).toBeVisible();
      await page.getByRole("button", { name: "Publish" }).click();
      await expect(page.getByText("Program published.")).toBeVisible();

      const publicPage = await context.newPage();
      await publicPage.goto("/", { waitUntil: "networkidle" });
      await expect(publicPage.getByRole("heading", { name: programTitle })).toBeVisible();
      await publicPage.close();

      await page.getByRole("button", { name: "Archive" }).click();
      await expect(page.getByText("Program archived.")).toBeVisible();

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Media" }).click();
      await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible();
      await page.locator("#file").setInputFiles(pixel);
      await page.locator("#alt_text").fill("D1.2 synthetic pixel");
      await page.getByRole("button", { name: "Upload" }).click();
      await expect(page.getByText("Image uploaded.")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("D1.2 synthetic pixel")).toBeVisible();
      const { data: mediaRow } = await admin
        .from("media_assets")
        .select("id")
        .eq("alt_text", "D1.2 synthetic pixel")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mediaRow?.id) mediaIds.push(mediaRow.id);

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Sermons" }).click();
      await page.getByRole("link", { name: "New sermon" }).click();
      await page.locator("#title").fill(sermonTitle);
      await page.locator("#speaker").fill("D1.2 Validation");
      await page.locator("#youtube_url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      await page.getByRole("button", { name: "Create draft" }).click();
      await expect(page.getByText("Draft sermon created.")).toBeVisible();
      sermonId = page.url().match(/\/admin\/sermons\/([^/?#]+)/)?.[1] ?? null;
      await page.locator("#speaker").fill("D1.2 Validation edited");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Sermon saved.")).toBeVisible();

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Livestream" }).click();
      await expect(page.getByRole("heading", { name: "Livestream" })).toBeVisible();
      await page.locator("#facebook_url").fill("https://www.facebook.com/kcmi.d12.validation");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Livestream settings saved.")).toBeVisible();

      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL("**/auth/sign-in");

      await signInStaff(page, branchEmail);
      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Branches" }).click();
      await page.getByRole("link", { name: "Accra" }).first().click();
      await expect(page.getByRole("heading", { name: "Accra" })).toBeVisible();
      await page.locator("#file").setInputFiles(pixel);
      await page.locator("#alt_text").fill("D1.2 Accra attach");
      await page.getByRole("button", { name: "Add Image" }).click();
      await expect(page.getByText("Photo added to this branch.")).toBeVisible({
        timeout: 20_000,
      });
      const { data: branchAsset } = await admin
        .from("media_assets")
        .select("id")
        .eq("alt_text", "D1.2 Accra attach")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (branchAsset?.id) mediaIds.push(branchAsset.id);
      const { data: link } = await admin
        .from("branch_media")
        .select("id")
        .eq("branch_id", ACCRA_BRANCH_ID)
        .eq("media_asset_id", branchAsset?.id ?? "")
        .maybeSingle();
      branchMediaId = link?.id ?? null;
      expect(branchMediaId).toBeTruthy();

      await page.goto(`/admin/branches/${TOGO_BRANCH_ID}`);
      const city = page.locator("#city_label");
      if (await city.count()) {
        await city.fill("Hacked Lome");
        await page.getByRole("button", { name: "Save branch" }).click();
        await expect(page.getByRole("alert")).toBeVisible();
      }
      const { data: togo } = await admin
        .from("church_branches")
        .select("city_label")
        .eq("id", TOGO_BRANCH_ID)
        .single();
      expect(togo?.city_label).not.toBe("Hacked Lome");
    } finally {
      await cleanupSyntheticRecords({
        programId,
        sermonId,
        mediaIds,
        branchMediaId,
        userIds: [publisher.id, branchUser.id],
        restoreLivestream: livestreamBefore
          ? {
              facebook_url: livestreamBefore.facebook_url,
              is_live: livestreamBefore.is_live,
            }
          : null,
      });
    }
  });
});
