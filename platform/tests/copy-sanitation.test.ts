import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { privacyPolicy } from "@/content/seed/legal-privacy";
import { termsOfService } from "@/content/seed/legal-terms";
import {
  OPERATING_ROLE_LABELS,
  permissionsForRoles,
} from "@/lib/authorization/rbac";
import { canViewCareHub } from "@/lib/care/access";
import { canViewRequestsInbox } from "@/lib/requests/access";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function withoutComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Copy sanitation — user-facing surfaces", () => {
  it("keeps Google Forms out of public and Hub runtime copy", () => {
    const roots = ["src/app", "src/components", "src/content"].map((p) =>
      resolve(process.cwd(), p),
    );
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walkTsFiles(root)) {
        if (file.endsWith("stale-seed-replacements.ts")) continue;
        const src = readFileSync(file, "utf8");
        if (/forms\.gle|docs\.google\.com\/forms/i.test(src)) {
          offenders.push(file);
          continue;
        }
        if (/Google Forms?/i.test(withoutComments(src))) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses native Care wording in the Hub", () => {
    for (const path of [
      "src/app/admin/care/prayer/page.tsx",
      "src/app/admin/care/pastoral/page.tsx",
      "src/app/admin/care/welfare/page.tsx",
      "src/app/admin/care/page.tsx",
    ]) {
      const src = readSrc(path);
      expect(src).not.toMatch(/Google Forms/i);
      expect(src).not.toMatch(/later phase/i);
      expect(src).not.toMatch(/\bqueue\b/i);
    }
    expect(readSrc("src/app/admin/care/prayer/page.tsx")).toContain(
      "No prayer requests to review.",
    );
    expect(readSrc("src/app/admin/care/pastoral/page.tsx")).toContain(
      "No Pastoral Care requests to review.",
    );
    expect(readSrc("src/app/admin/care/welfare/page.tsx")).toContain(
      "No Welfare requests to review.",
    );
  });

  it("keeps Messages empty states and Contact success church-plain", () => {
    const requests = readSrc("src/app/admin/requests/page.tsx");
    expect(requests).toContain("No new messages right now.");
    expect(requests).not.toMatch(/No records found|Empty dataset|No rows/i);

    const form = readSrc("src/components/contact/contact-request-form.tsx");
    expect(form).toContain("You can safely close this page.");
    expect(form).not.toMatch(/Reference:/);
    for (const src of [
      form,
      readSrc("src/app/(site)/contact/page.tsx"),
      readSrc("src/components/hub/website-request-detail.tsx"),
    ]) {
      expect(src).not.toMatch(/\bticket\b/i);
      expect(src).not.toMatch(/\bcustomer\b/i);
      expect(src).not.toMatch(/\bSLA\b/);
    }
  });

  it("shows church role names instead of internal codes", () => {
    expect(OPERATING_ROLE_LABELS.care_operator).toBe("Care Staff");
    expect(OPERATING_ROLE_LABELS.media_admin).toBe("Website & Media");
    expect(OPERATING_ROLE_LABELS.super_admin).toBe("Super Admin");
    const presets = readSrc("src/lib/hub/staff-presets.ts");
    expect(presets).toContain('title: "Website & Media"');
    expect(presets).toContain('title: "Care Staff"');
  });

  it("still keeps Care requests separate from website messages", () => {
    const care = permissionsForRoles(["care_operator"]);
    const media = permissionsForRoles(["media_admin"]);
    expect(canViewCareHub([...care])).toBe(true);
    expect(canViewRequestsInbox([...care])).toBe(false);
    expect(canViewRequestsInbox([...media])).toBe(true);
  });

  it("does not tell visitors that Care uses an outside form", () => {
    expect(readSrc("src/lib/care/intake-abuse.ts")).toContain(
      "Online requests are not available right now. Please contact KCMI another way.",
    );
    expect(readSrc("src/components/care/care-intake-unavailable.tsx")).not.toMatch(
      /temporarily unavailable/i,
    );
    for (const path of [
      "src/lib/care/prayer-submit.ts",
      "src/lib/care/pastoral-submit.ts",
      "src/lib/care/welfare-submit.ts",
    ]) {
      const src = readSrc(path);
      expect(src).toContain("CARE_INTAKE_GATE_DISABLED_MESSAGE");
      expect(src).not.toMatch(/form linked from Services/i);
      expect(src).not.toMatch(/First-party/i);
    }
  });

  it("keeps Privacy focused on people, not the rebuild stack", () => {
    const text = privacyPolicy.sections.flatMap((section) => section.paragraphs).join("\n");
    expect(text).not.toMatch(/Google Forms/i);
    expect(text).not.toMatch(/Next\.js|Vercel|Supabase|V2 platform|KCMI Hub/i);
    expect(text).not.toMatch(/camp\.kcmi-rcc\.org/i);
    expect(text).toMatch(/Prayer, Pastoral Care, and Welfare/i);
    expect(text).toMatch(/Contact page/i);
  });

  it("does not name Google Forms in the public Terms links section", () => {
    const section = termsOfService.sections.find((item) =>
      item.heading?.includes("Links"),
    );
    expect(section?.paragraphs.join(" ")).not.toMatch(/Google Forms/i);
  });

  it("keeps Silverbird and the retired camp host out of public seed links", () => {
    const sanitize = readSrc("src/content/website/sanitize-public-href.ts");
    expect(sanitize).toContain("isSilverbirdOwnedHref");
    const defaults = readSrc("src/content/website/defaults.ts");
    expect(defaults).not.toMatch(/https?:\/\/[^\s"']*silverbird/i);
    const privacy = privacyPolicy.sections
      .flatMap((section) => section.paragraphs)
      .join("\n");
    expect(privacy).not.toMatch(/silverbird/i);
    expect(privacy).not.toMatch(/camp\.kcmi-rcc\.org/i);
  });

  it("keeps Giving Hub copy off staging and database jargon", () => {
    const giving = readSrc("src/app/admin/giving/page.tsx");
    expect(giving).not.toMatch(/STAGING QA/i);
    expect(giving).not.toMatch(/database destinations/i);
    expect(giving).toContain("No published Giving destinations yet.");
    const propose = readSrc("src/app/admin/giving/propose/new/page.tsx");
    expect(propose).not.toMatch(/STAGING QA|cutover|database/i);
    expect(propose).toContain("emptyGivingSnapshot");
  });
});
