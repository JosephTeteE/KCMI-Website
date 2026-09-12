/**
 * Visual candidate integrity — reject error/auth/wrong-state captures.
 */

import type { Page } from "@playwright/test";

export type CandidateSpec = {
  name: string;
  base: "PUBLIC" | "HUB";
  path: string;
  landmark: RegExp;
  viewport?: { width: number; height: number };
};

export type CandidateResult = {
  name: string;
  path: string;
  status: "SUCCESS" | "FAIL";
  reason?: string;
  file?: string;
};

const ERROR_RE =
  /This page couldn.?t load|A server error occurred|Application error|Internal Server Error/i;
const AUTH_RE = /Sign in to the KCMI Hub|Enter the code from your authenticator/i;

export async function assertPageIntegrity(
  page: Page,
  spec: CandidateSpec,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const url = page.url();
  if (/\/auth\/sign-in/i.test(url) && spec.base === "HUB") {
    return { ok: false, reason: "unexpected auth redirect" };
  }
  if (/\/auth\//i.test(url) && !/sign-in/i.test(spec.path)) {
    return { ok: false, reason: `unexpected auth URL ${url}` };
  }
  const body = await page.locator("body").innerText().catch(() => "");
  if (ERROR_RE.test(body)) {
    return { ok: false, reason: "generic server error page" };
  }
  if (spec.base === "PUBLIC" && AUTH_RE.test(body) && !/sign-in/i.test(spec.path)) {
    return { ok: false, reason: "unexpected sign-in page" };
  }
  const landmarkOk = await page.getByText(spec.landmark).first().isVisible().catch(() => false);
  if (!landmarkOk) {
    // Fallback: landmark in body text
    if (!spec.landmark.test(body)) {
      return {
        ok: false,
        reason: `missing landmark ${spec.landmark}`,
      };
    }
  }
  return { ok: true };
}

export const DEFAULT_CANDIDATE_SPECS: CandidateSpec[] = [
  {
    name: "public-home-desktop",
    base: "PUBLIC",
    path: "/",
    landmark: /Raising Kings|KCMI|Plan a Visit/i,
  },
  {
    name: "public-home-mobile",
    base: "PUBLIC",
    path: "/",
    landmark: /Raising Kings|KCMI|Plan a Visit/i,
    viewport: { width: 390, height: 844 },
  },
  {
    name: "public-about-desktop",
    base: "PUBLIC",
    path: "/about",
    landmark: /About/i,
  },
  {
    name: "public-locations-desktop",
    base: "PUBLIC",
    path: "/locations",
    landmark: /Location|Search|Find/i,
  },
  {
    name: "public-branch-desktop",
    base: "PUBLIC",
    path: "/locations/headquarters",
    landmark: /Headquarters|Location|Service/i,
  },
  {
    name: "public-services-desktop",
    base: "PUBLIC",
    path: "/services",
    landmark: /Service|Ministr/i,
  },
  {
    name: "public-sermons-desktop",
    base: "PUBLIC",
    path: "/sermons",
    landmark: /Sermon/i,
  },
  {
    name: "public-contact-desktop",
    base: "PUBLIC",
    path: "/contact",
    landmark: /Contact/i,
  },
  {
    name: "public-livestream-desktop",
    base: "PUBLIC",
    path: "/livestream",
    landmark: /Live|Facebook|not live|Watch/i,
  },
  {
    name: "public-sign-in",
    base: "PUBLIC",
    path: "/auth/sign-in",
    landmark: /Sign in to the KCMI Hub/i,
  },
  {
    name: "hub-dashboard",
    base: "HUB",
    path: "/admin",
    landmark: /What would you like to update/i,
  },
  {
    name: "hub-home-editor",
    base: "HUB",
    path: "/admin/website/home",
    landmark: /Homepage|Edit this section|Banner/i,
  },
  {
    name: "hub-program-create",
    base: "HUB",
    path: "/admin/programs/new",
    landmark: /New program|About this program|Program name/i,
  },
  {
    name: "hub-program-edit",
    base: "HUB",
    path: "/admin/programs/4798d76c-6112-4870-9f52-7d1ab38d06bd",
    landmark: /STAGING QA|DRAFT|Program name|When is it/i,
  },
  {
    name: "hub-program-review",
    base: "HUB",
    path: "/admin/programs/4798d76c-6112-4870-9f52-7d1ab38d06bd",
    landmark: /Review|Save draft/i,
  },
  {
    name: "hub-branches",
    base: "HUB",
    path: "/admin/branches",
    landmark: /Branch/i,
  },
  {
    name: "hub-media",
    base: "HUB",
    path: "/admin/media",
    landmark: /Photo|Media|Library/i,
  },
  {
    name: "hub-livestream",
    base: "HUB",
    path: "/admin/livestream",
    landmark: /Livestream|Facebook/i,
  },
];
