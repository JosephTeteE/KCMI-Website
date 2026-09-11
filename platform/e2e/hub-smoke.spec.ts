import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { hasHubEnv } from "./helpers/env";
import {
  ACCRA_BRANCH_ID,
  TOGO_BRANCH_ID,
  cleanupSyntheticRecords,
  createSyntheticUser,
  dismissHubTourIfPresent,
  serviceClient,
  signInStaff,
} from "./helpers/hub";

const pixel = resolve(process.cwd(), "e2e/fixtures/pixel.png");

test.describe("Hub browser smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("programs, media, branch, sermons, livestream", async ({ page, context }) => {
    test.setTimeout(300_000);
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
      await expect(
        page.getByRole("heading", { name: "What would you like to update?" }),
      ).toBeVisible({
        timeout: 20_000,
      });
      await dismissHubTourIfPresent(page);

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Programs & Announcements" }).click();
      await expect(page.getByRole("heading", { name: "Programs & Announcements" })).toBeVisible();
      await page.getByRole("link", { name: "New program" }).click();
      await page.locator("#title").fill(programTitle);
      await page.locator("#short_description").fill("Synthetic D1.2 program");
      await page.locator("#cta_label").fill("Learn more");
      await page.locator("#cta_url").fill("/events");
      await page.locator("#placement").selectOption("featured");
      await page.getByRole("button", { name: "Save as a draft (not public yet)" }).click();
      await expect(page.getByText("Your program draft is saved. It is not on the public website yet.")).toBeVisible();
      programId = page.url().match(/\/admin\/programs\/([^/?#]+)/)?.[1] ?? null;
      expect(programId).toBeTruthy();

      await page.getByRole("link", { name: "Preview this program" }).click();
      await expect(page.getByRole("heading", { name: programTitle }).first()).toBeVisible();
      await page.goto(`/admin/programs/${programId}`);
      await page.getByRole("button", { name: "Mark ready for preview" }).click();
      await expect(page.getByText("This program is ready to preview. It is not public yet.")).toBeVisible();
      await page.getByRole("button", { name: "Make this live on the website" }).click();
      await expect(page.getByText("This program is now live on the website.")).toBeVisible();
      await expect(page.getByText("Currently on the website").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Change these details" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save my draft" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Mark ready for preview" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Make this live on the website" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove from public website" })).toBeVisible();

      const publicPage = await context.newPage();
      await publicPage.goto("/", { waitUntil: "networkidle" });
      await expect(publicPage.getByRole("heading", { name: programTitle })).toBeVisible();
      await publicPage.close();

      await page.getByRole("button", { name: "Remove from public website" }).click();
      await expect(page.getByText("This program is no longer on the public website.")).toBeVisible();

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Photos" }).click();
      await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
      await page.locator('input[name="file"]').setInputFiles(pixel);
      await page.locator('input[name="alt_text"]').fill("D1.2 synthetic pixel");
      await page.getByRole("button", { name: "Add this photo to the library" }).click();
      await expect(page.getByText("The photo is ready to use on the website.")).toBeVisible({
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
      await page.getByRole("button", { name: "Save as a draft (not public yet)" }).click();
      await expect(page.getByText("Your sermon draft is saved. It is not on the public website yet.")).toBeVisible();
      sermonId = page.url().match(/\/admin\/sermons\/([^/?#]+)/)?.[1] ?? null;
      await page.getByRole("button", { name: "Change these details" }).click();
      await page.locator("#proposed-speaker").fill("D1.2 Validation edited");
      await page.getByRole("button", { name: "Preview my changes" }).click();
      await page.getByRole("button", { name: "Save my sermon details" }).click();
      await expect(page.getByText("Your sermon details are saved.")).toBeVisible();
      await page.getByRole("button", { name: "Make this live on the website" }).click();
      await expect(page.getByText("This sermon is now live on the website.")).toBeVisible();
      await expect(page.getByText("Currently on the website").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Save my draft" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Mark ready for preview" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Make this live on the website" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove from public website" })).toBeVisible();

      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Livestream" }).click();
      await expect(page.getByRole("heading", { name: "Livestream" })).toBeVisible();
      await page.getByRole("button", { name: "Start a Facebook livestream" }).click();
      await page.locator("#facebook_embed").fill(
        '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fkcmi.d12.validation"></iframe>',
      );
      await page.getByRole("button", { name: "Check and Preview" }).click();
      await expect(page.getByText("Facebook video recognized")).toBeVisible();
      await page.getByRole("button", { name: "Start a Facebook livestream" }).click();
      await expect(page.getByText("The website is now showing the livestream.")).toBeVisible();
      await expect(page.getByText("A live video is on")).toBeVisible();
      await expect(page.getByRole("button", { name: "Change live video" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Turn off the livestream" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Make Livestream Live" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Start a Facebook livestream" })).toHaveCount(0);

      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL("**/auth/sign-in");

      await signInStaff(page, branchEmail);
      await dismissHubTourIfPresent(page);
      await page.getByRole("navigation", { name: "Hub" }).getByRole("link", { name: "Branches" }).click();
      await page.getByRole("link", { name: "Accra" }).first().click();
      await expect(page.getByRole("heading", { name: "Accra" })).toBeVisible();
      const gallery = page
        .locator("section")
        .filter({ hasText: "More branch photos" })
        .last();
      await gallery.getByRole("button", { name: "Add a gallery photo" }).click();
      await gallery.getByRole("button", { name: "Upload a new photo" }).click();
      await gallery.locator('input[name="file"]').setInputFiles(pixel);
      await gallery.locator('input[name="alt_text"]').fill("D1.2 Accra attach");
      await gallery.getByRole("button", { name: "Upload this photo" }).click();
      await expect(
        page.getByText("This photo is ready. Preview it, then make it live"),
      ).toBeVisible({ timeout: 20_000 });

      const { data: branchAsset } = await admin
        .from("media_assets")
        .select("id")
        .eq("alt_text", "D1.2 Accra attach")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (branchAsset?.id) mediaIds.push(branchAsset.id);
      expect(branchAsset?.id).toBeTruthy();

      // Uploading stages the photo only: the branch page must not change yet.
      const { data: stagedLink } = await admin
        .from("branch_media")
        .select("id")
        .eq("branch_id", ACCRA_BRANCH_ID)
        .eq("media_asset_id", branchAsset?.id ?? "")
        .maybeSingle();
      expect(stagedLink).toBeNull();

      const stagedGallery = page
        .locator("section")
        .filter({ hasText: "More branch photos" })
        .last();
      await stagedGallery.getByRole("button", { name: "Preview my changes" }).click();
      await stagedGallery
        .getByRole("button", { name: "Make this photo live on the website" })
        .click();
      await expect(page.getByText("This photo was added to the branch page.")).toBeVisible({
        timeout: 20_000,
      });
      const { data: link } = await admin
        .from("branch_media")
        .select("id")
        .eq("branch_id", ACCRA_BRANCH_ID)
        .eq("media_asset_id", branchAsset?.id ?? "")
        .maybeSingle();
      branchMediaId = link?.id ?? null;
      expect(branchMediaId).toBeTruthy();

      await page.goto(`/admin/branches/${TOGO_BRANCH_ID}`);
      const changeDetails = page.getByRole("button", {
        name: "Change branch details",
      });
      if (await changeDetails.count()) {
        await changeDetails.click();
        await page.locator("#proposed-city").fill("Hacked Lome");
        await page.getByRole("button", { name: "Preview my changes" }).click();
        await page
          .getByRole("button", { name: "Make these branch details live" })
          .click();
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
