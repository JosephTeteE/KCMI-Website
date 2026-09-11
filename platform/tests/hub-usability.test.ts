import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { facebookControlledEmbedSrc } from "@/lib/cms/facebook-url";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { HUB_DASHBOARD_CARDS } from "@/lib/hub/dashboard-cards";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";
import {
  humanMfaError,
  humanPermissionDenied,
  humanSignInError,
} from "@/lib/hub/humanize";
import {
  emptyProposedCopy,
  hasProposedCopy,
  mergeProposedCopy,
} from "@/lib/hub/propose";
import {
  HUB_TOUR_STORAGE_KEY,
  HUB_TOUR_STEPS,
  isHubTourComplete,
  markHubTourComplete,
  resetHubTour,
} from "@/lib/hub/tour";
import {
  aboutVisualSectionIds,
  editCategoryTourTarget,
  homeVisualCategoryIds,
  homeVisualSectionIds,
  homeVisualSectionTourTarget,
} from "@/lib/hub/visual-sections";
import {
  hubCurrentSectionCopy,
  hubLifecycleActions,
  hubPreviewVariant,
  hubPublicationStateFromStatus,
  mayRemoveFromWebsite,
} from "@/lib/hub/publication-copy";
import {
  livestreamConfirmLabel,
  livestreamPrimaryAction,
} from "@/lib/hub/livestream-state";
import { replacementForExactStoredValue } from "@/content/website/stale-seed-replacements";
import {
  defaultHomeDocument,
  defaultSermonsPageDocument,
} from "@/content/website/defaults";
import {
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/authorization/rbac";

describe("Hub current vs proposed copy", () => {
  it("keeps live text when proposed boxes are empty", () => {
    const current = { headline: "Live title", body: "Live body" };
    const proposed = emptyProposedCopy(current);
    expect(proposed.headline).toBe("");
    expect(mergeProposedCopy(current, proposed)).toEqual(current);
    expect(hasProposedCopy(proposed)).toBe(false);
  });

  it("uses proposed text only after a volunteer types a replacement", () => {
    const current = { headline: "Live title", body: "Live body" };
    const merged = mergeProposedCopy(current, { headline: "New title" });
    expect(merged.headline).toBe("New title");
    expect(merged.body).toBe("Live body");
  });
});

describe("known-context media placement language", () => {
  it("uses volunteer placement names, not hero/CMS jargon", () => {
    expect(HUB_MEDIA_PLACEMENTS.homeTopBanner.title).toBe(
      "Homepage Top Banner Photo",
    );
    expect(HUB_MEDIA_PLACEMENTS.programPoster.title).toBe(
      "Program Poster / Main Photo",
    );
    expect(HUB_MEDIA_PLACEMENTS.branchTopPhoto.title).toBe("Branch Top Photo");
    expect(JSON.stringify(HUB_MEDIA_PLACEMENTS)).not.toMatch(/\bCMS\b/);
    expect(JSON.stringify(HUB_MEDIA_PLACEMENTS)).not.toMatch(/\bHero\b/);
  });
});

describe("Hub action labels", () => {
  it("uses meaningful volunteer verbs", () => {
    expect(HUB_ACTION_LABELS.previewChanges).toBe("Preview my changes");
    expect(HUB_ACTION_LABELS.makeLive).toBe("Make this live on the website");
    expect(HUB_ACTION_LABELS.cancelChanges).toBe("Cancel changes");
    expect(HUB_ACTION_LABELS.makeLivestreamLive).toBe("Make Livestream Live");
    expect(HUB_ACTION_LABELS.removeFromWebsite).toBe("Remove from public website");
    const labels: readonly string[] = Object.values(HUB_ACTION_LABELS);
    expect(labels.includes("Submit")).toBe(false);
  });
});

describe("Dashboard action cards", () => {
  it("routes to the Hub screens volunteers need", () => {
    const hrefs = HUB_DASHBOARD_CARDS.map((card) => card.href);
    expect(hrefs).toEqual([
      "/admin/website/home",
      "/admin/programs",
      "/admin/branches",
      "/admin/sermons",
      "/admin/livestream",
      "/admin/media",
    ]);
    expect(HUB_DASHBOARD_CARDS.map((card) => card.title)).toEqual([
      "Homepage",
      "Programs & Announcements",
      "Branches",
      "Sermons",
      "Livestream",
      "Photos / Media Library",
    ]);
  });
});

describe("Hub tour persistence", () => {
  it("can start, skip/complete, and replay with a versioned local key", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    expect(HUB_TOUR_STORAGE_KEY).toBe("kcmi-hub-tour-v1-complete");
    expect(HUB_TOUR_STEPS).toHaveLength(11);
    expect(HUB_TOUR_STEPS.every((step) => step.target.includes("data-tour"))).toBe(
      true,
    );
    expect(isHubTourComplete(storage)).toBe(false);
    markHubTourComplete(storage);
    expect(isHubTourComplete(storage)).toBe(true);
    resetHubTour(storage);
    expect(isHubTourComplete(storage)).toBe(false);
  });
});

describe("HQ Content Admin authorization", () => {
  it("keeps website.manage for HQ Content Admin and denies unrelated roles", () => {
    const hq = permissionsForRoles(["media_admin"]);
    expect(hq.has("website.manage")).toBe(true);
    expect(hq.has("hub.access")).toBe(true);
    expect(roleHasPermission("program_drafter", "website.manage")).toBe(false);
    expect(roleHasPermission("branch_admin", "website.manage")).toBe(false);
    expect(roleHasPermission("pastor", "website.manage")).toBe(false);
    expect(humanPermissionDenied("website.manage")).not.toMatch(/website\.manage/);
  });
});

describe("Hub sign-in errors", () => {
  it("explains Auth timeouts without GoTrue wording", () => {
    expect(humanSignInError("Processing this request timed out, please retry after a moment.")).toBe(
      "Sign-in took too long. Wait a moment and try again.",
    );
    expect(humanSignInError("Invalid login credentials")).toBe(
      "That email or password is not right. Check both and try again.",
    );
  });
});

describe("Hub MFA volunteer language", () => {
  it("explains bad codes without TOTP/AAL2 jargon", () => {
    expect(humanMfaError("Invalid TOTP code")).toBe(
      "That 6-digit code is not right or has expired. Open your authenticator app for a new code and try again.",
    );
    expect(humanMfaError("expired")).toMatch(/authenticator app/);
    expect(humanMfaError("Invalid TOTP code")).not.toMatch(/TOTP|AAL2/i);
  });

  it("keeps live sermon, branch, and featured values out of default editable fields", () => {
    const sermon = readFileSync(
      resolve(process.cwd(), "src/components/hub/sermon-editor.tsx"),
      "utf8",
    );
    const branch = readFileSync(
      resolve(process.cwd(), "src/components/hub/branch-details-editor.tsx"),
      "utf8",
    );
    const featured = readFileSync(
      resolve(process.cwd(), "src/components/hub/featured-program-chooser.tsx"),
      "utf8",
    );
    const mfa = readFileSync(
      resolve(process.cwd(), "src/app/auth/mfa/page.tsx"),
      "utf8",
    );
    expect(HUB_ACTION_LABELS.changeSermonDetails).toBe("Change these details");
    expect(HUB_ACTION_LABELS.changeBranchDetails).toBe("Change branch details");
    expect(HUB_ACTION_LABELS.useCurrentInformation).toBe(
      "Use current information as my starting point",
    );
    expect(HUB_ACTION_LABELS.changeFeaturedProgram).toBe(
      "Choose a different featured program",
    );
    expect(HUB_ACTION_LABELS.makeFeaturedLive).toBe(
      "Make this program live on the homepage",
    );
    expect(sermon).toMatch(/changeSermonDetails/);
    expect(sermon).toMatch(/HubCopyProposeForm/);
    expect(branch).toMatch(/changeBranchDetails/);
    expect(branch).toMatch(/useCurrentInformation/);
    expect(branch).toMatch(/Currently on the website/);
    expect(featured).toMatch(/Currently on the website/);
    expect(featured).toMatch(/changeFeaturedProgram/);
    expect(featured).toMatch(/makeFeaturedLive/);
    expect(featured).toMatch(/Feature this when visitors first open the website/);
    expect(featured).toMatch(/Show once on this device/);
    expect(mfa).toMatch(/QR code to connect your authenticator app/);
    expect(mfa).toMatch(/Your authenticator app gives you a new 6-digit code/);
    expect(mfa).not.toMatch(/TOTP enrollment QR code/);
  });
});

describe("controlled Facebook embed src", () => {
  it("builds a Facebook plugin URL from a stored video URL", () => {
    const src = facebookControlledEmbedSrc("https://www.facebook.com/watch/?v=123");
    expect(src).toContain("https://www.facebook.com/plugins/video.php");
    expect(src).not.toContain("<iframe");
  });
});

describe("draft vs live Hub language", () => {
  it("does not call a draft currently on the website", () => {
    expect(hubPublicationStateFromStatus("draft")).toBe("draft");
    expect(hubCurrentSectionCopy("draft")).toEqual({
      heading: "Current draft",
      note: "Not visible to website visitors yet",
    });
    expect(hubPreviewVariant("draft", "live")).toBe("draft");
    expect(mayRemoveFromWebsite("draft")).toBe(false);
    expect(mayRemoveFromWebsite("published")).toBe(true);
    expect(hubCurrentSectionCopy("published").heading).toBe(
      "Currently on the website",
    );
  });
});

describe("Hub preview fit scale", () => {
  it("shrinks the desktop canvas to the card width without a readable-size floor", async () => {
    const { hubPreviewFitScale, HUB_PREVIEW_CANVAS_WIDTH } = await import(
      "@/components/hub/hub-preview-frame"
    );
    expect(HUB_PREVIEW_CANVAS_WIDTH).toBe(960);
    expect(hubPreviewFitScale(960)).toBe(1);
    expect(hubPreviewFitScale(1280)).toBe(1);
    expect(hubPreviewFitScale(480)).toBe(0.5);
    expect(hubPreviewFitScale(336)).toBe(0.35);
    expect(hubPreviewFitScale(336)).toBeLessThan(0.72);
    expect(HUB_ACTION_LABELS.viewFullSizePreview).toBe("View full-size preview");
    const src = readFileSync(
      resolve(process.cwd(), "src/components/hub/hub-preview-frame.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/Scroll sideways/);
    expect(src).not.toMatch(/MIN_READABLE_SCALE/);
    expect(src).not.toMatch(/overflow-x-auto/);
    expect(src).toMatch(/viewFullSizePreview/);
  });
});

describe("published vs draft Hub lifecycle actions", () => {
  it("keeps draft and published status actions exclusive", () => {
    expect(hubLifecycleActions("draft")).toEqual({
      saveDraft: true,
      markReadyForPreview: true,
      makeLive: true,
      removeFromWebsite: false,
      restoreDraft: false,
    });
    expect(hubLifecycleActions("preview")).toEqual({
      saveDraft: true,
      markReadyForPreview: false,
      makeLive: true,
      removeFromWebsite: false,
      restoreDraft: false,
    });
    expect(hubLifecycleActions("published")).toEqual({
      saveDraft: false,
      markReadyForPreview: false,
      makeLive: false,
      removeFromWebsite: true,
      restoreDraft: false,
    });
    expect(hubLifecycleActions("archived")).toEqual({
      saveDraft: false,
      markReadyForPreview: false,
      makeLive: false,
      removeFromWebsite: false,
      restoreDraft: true,
    });
    expect(hubCurrentSectionCopy("draft").heading).toBe("Current draft");
    expect(hubCurrentSectionCopy("published").heading).toBe(
      "Currently on the website",
    );
  });

  it("does not pair Live on website language with draft lifecycle in editors", () => {
    const program = readFileSync(
      resolve(process.cwd(), "src/components/hub/program-editor.tsx"),
      "utf8",
    );
    const sermon = readFileSync(
      resolve(process.cwd(), "src/components/hub/sermon-editor.tsx"),
      "utf8",
    );
    const copyForm = readFileSync(
      resolve(process.cwd(), "src/components/hub/hub-copy-propose-form.tsx"),
      "utf8",
    );
    expect(program).toMatch(/hubLifecycleActions/);
    expect(sermon).toMatch(/hubLifecycleActions/);
    expect(copyForm).toMatch(/makeChangesLive/);
    expect(copyForm).not.toMatch(/liveLabel = HUB_ACTION_LABELS\.makeLive/);
  });
});

describe("livestream submit kind", () => {
  it("does not offer turn-off when the site is already not live", () => {
    expect(livestreamPrimaryAction({ isLive: false, flow: "idle" })).toBe("none");
    expect(livestreamPrimaryAction({ isLive: true, flow: "idle" })).toBe(
      "turn-off",
    );
    expect(livestreamPrimaryAction({ isLive: false, flow: "start" })).toBe(
      "start",
    );
    expect(livestreamPrimaryAction({ isLive: true, flow: "change" })).toBe(
      "update",
    );
    expect(livestreamConfirmLabel("update")).toBe("Update the live video");
    expect(livestreamConfirmLabel("start")).toBe("Start a Facebook livestream");
    expect(livestreamConfirmLabel("update")).not.toBe("Make Livestream Live");
  });

  it("does not use Make Livestream Live as the live-state primary action", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/hub/livestream-editor.tsx"),
      "utf8",
    );
    expect(src).toMatch(/startLivestream/);
    expect(src).toMatch(/changeLiveVideo/);
    expect(src).toMatch(/livestreamConfirmLabel/);
    expect(src).not.toMatch(/makeLivestreamLive/);
  });
});

describe("stale website_documents seed repair", () => {
  it("replaces only exact original seed strings", () => {
    expect(
      replacementForExactStoredValue(
        "sermons_page",
        ["headline"],
        "Experience the Word of God Anytime, Anywhere.",
      ),
    ).toBe(defaultSermonsPageDocument.headline);
    expect(
      replacementForExactStoredValue(
        "sermons_page",
        ["headline"],
        "Operator-edited sermons headline",
      ),
    ).toBeNull();
    expect(
      replacementForExactStoredValue(
        "home",
        ["heroHeadline"],
        "Kingdom Covenant Ministries International",
      ),
    ).toBe(defaultHomeDocument.heroHeadline);
    expect(
      replacementForExactStoredValue(
        "home",
        ["heroHeadline"],
        "Operator kept custom headline",
      ),
    ).toBeNull();
  });
});

describe("Homepage Hub visual section editor", () => {
  it("indexes homepage work with live section previews and category choices", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/hub/home-website-editor.tsx"),
      "utf8",
    );
    const config = readFileSync(
      resolve(process.cwd(), "src/lib/hub/visual-sections.ts"),
      "utf8",
    );
    expect(src).toMatch(/What would you like to change\?/);
    expect(src).toMatch(/All homepage sections/);
    expect(src).toMatch(/Edit this section/);
    expect(src).toMatch(/data-tour="home-section-chooser"/);
    expect(src).toMatch(/editCategoryTourTarget/);
    expect(src).toMatch(/HOME_VISUAL_SECTIONS/);
    expect(config).toMatch(/Top of Homepage/);
    expect(config).toMatch(/KCMI Spotlight/);
    expect(config).toMatch(/Discover KCMI/);
    expect(config).toMatch(/Watch \& Listen/);
    expect(config).toMatch(/Find a Location section/);
    expect(config).toMatch(/Prayer \& Giving/);
  });

  it("exposes typed visual section config for homepage and about", () => {
    expect(homeVisualSectionIds()).toEqual([
      "banner",
      "spotlight",
      "discover",
      "watch",
      "locations",
      "prayer-giving",
    ]);
    expect(homeVisualCategoryIds("banner")).toEqual(["words", "photo", "buttons"]);
    expect(homeVisualCategoryIds("spotlight")).toEqual(["program"]);
    expect(homeVisualCategoryIds("discover")).toEqual(["words", "photo"]);
    expect(homeVisualCategoryIds("watch")).toEqual(["words"]);
    expect(aboutVisualSectionIds()).toEqual([
      "who-we-are",
      "vision-mission",
      "leadership",
      "portrait",
    ]);
    expect(homeVisualSectionTourTarget("banner")).toBe("home-visual-section-banner");
    expect(editCategoryTourTarget("words")).toBe("edit-category-words");
  });
});

describe("Hub volunteer typography floor", () => {
  it("keeps form labels and buttons at text-base", () => {
    const fields = readFileSync(
      resolve(process.cwd(), "src/components/hub/hub-form-fields.tsx"),
      "utf8",
    );
    expect(fields).toMatch(/labelClass = "block text-base/);
    expect(fields).toMatch(/text-base font-semibold/);
    expect(fields).not.toMatch(/text-xs/);
  });
});

describe("Hub mobile navigation", () => {
  it("uses a Menu control and desktop sidebar", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/layout/hub-nav.tsx"),
      "utf8",
    );
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/admin/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Open Hub menu/);
    expect(src).toMatch(/lg:hidden/);
    expect(src).toMatch(/hidden w-full max-w-xs[\s\S]*lg:block/);
    expect(layout).toMatch(/lg:flex-row/);
    expect(layout).not.toMatch(/md:flex-row/);
  });
});

describe("staging bootstrap expected permissions", () => {
  it("includes website.manage for Super Admin and HQ Content Admin", () => {
    const src = readFileSync(
      resolve(process.cwd(), "scripts/bootstrap-staging-hub-users.mjs"),
      "utf8",
    );
    expect(src).toMatch(/media_admin:[\s\S]*website\.manage/);
    expect(src).toMatch(/HQ Content Admin[\s\S]*website\.manage/);
    expect(src).toMatch(/Super Admin[\s\S]*website\.manage/);
  });
});
