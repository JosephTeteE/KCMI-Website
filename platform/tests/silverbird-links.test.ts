import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSermonPlatforms, getPrivacyPolicy } from "@/content";
import {
  isSilverbirdOwnedHref,
  sanitizePlatformHref,
} from "@/content/website/sanitize-public-href";
import { validateSocialUrl } from "@/lib/cms/social-url";
import { SOCIAL_ALLOWED_HOSTS } from "@/lib/cms/social-url";
import { defaultSermonsPageDocument } from "@/content/website/defaults";
import { resolveSermonsPageDocument } from "@/content/website/resolve";
import { mapSermonPlatforms } from "@/content/website/public-map";

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Silverbird outbound links removed", () => {
  it("detects Silverbird-owned hrefs and clears them for platform cards", () => {
    expect(isSilverbirdOwnedHref("https://silverbirdtv.com")).toBe(true);
    expect(isSilverbirdOwnedHref("https://www.silverbirdtv.com/schedule")).toBe(
      true,
    );
    expect(isSilverbirdOwnedHref("https://silverbirdgroup.com")).toBe(true);
    expect(isSilverbirdOwnedHref("/locations")).toBe(false);
    expect(isSilverbirdOwnedHref("https://www.youtube.com/@rehoboth-tv")).toBe(
      false,
    );
    expect(sanitizePlatformHref("https://silverbirdtv.com")).toBe("");
    expect(sanitizePlatformHref("https://www.youtube.com/@rehoboth-tv")).toBe(
      "https://www.youtube.com/@rehoboth-tv",
    );
  });

  it("keeps Silverbird venue/broadcast name as plain text without a link", async () => {
    const platforms = await getSermonPlatforms();
    const silverbird = platforms.find((item) => item.id === "silverbird");
    expect(silverbird).toBeDefined();
    expect(silverbird?.name).toMatch(/Silverbird/);
    expect(silverbird?.href).toBe("");
    expect(silverbird?.external).toBe(false);
    expect(JSON.stringify(platforms)).not.toMatch(/silverbirdtv\.com/i);
    expect(JSON.stringify(platforms)).not.toMatch(/https?:\/\/[^\"]*silverbird/i);
  });

  it("strips a stored CMS Silverbird URL at resolve/map time", () => {
    const resolved = resolveSermonsPageDocument({
      ...defaultSermonsPageDocument,
      platforms: [
        {
          id: "silverbird",
          name: "Silverbird · Rehoboth Wells",
          description: "Broadcast mention only.",
          href: "https://silverbirdtv.com",
          external: true,
        },
      ],
    });
    const mapped = mapSermonPlatforms(resolved);
    expect(resolved.platforms[0]?.href).toBe("");
    expect(mapped[0]?.href).toBe("");
    expect(mapped[0]?.external).toBe(false);
    expect(mapped[0]?.name).toMatch(/Silverbird/);
  });

  it("does not allowlist Silverbird hosts for social/media URLs", () => {
    expect(SOCIAL_ALLOWED_HOSTS).not.toContain("silverbirdtv.com");
    expect(SOCIAL_ALLOWED_HOSTS).not.toContain("www.silverbirdtv.com");
    expect(validateSocialUrl("https://silverbirdtv.com").ok).toBe(false);
    expect(validateSocialUrl("https://www.youtube.com/@rehoboth-tv").ok).toBe(
      true,
    );
  });

  it("sermons page only renders an anchor when a platform href exists", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/(site)/sermons/page.tsx"),
      "utf8",
    );
    expect(source).toContain("{platform.href ? (");
    expect(source).toContain(") : null}");
    const hrefGateIndex = source.indexOf("{platform.href ? (");
    const openLinkIndex = source.indexOf("Open {platform.name}");
    expect(hrefGateIndex).toBeGreaterThan(-1);
    expect(openLinkIndex).toBeGreaterThan(hrefGateIndex);
  });

  it("platform runtime source has no Silverbird-owned href literals", () => {
    const roots = [
      resolve(process.cwd(), "src"),
      resolve(process.cwd(), "tests"),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walkTsFiles(root)) {
        // This test file intentionally mentions blocked hosts.
        if (file.endsWith("silverbird-links.test.ts")) continue;
        const text = readFileSync(file, "utf8");
        if (/https?:\/\/[^\s"'`]*silverbird/i.test(text)) {
          offenders.push(file.replace(process.cwd() + "/", ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("privacy copy no longer claims the site links to Silverbird’s website", () => {
    const text = getPrivacyPolicy()
      .sections.flatMap((section) => section.paragraphs)
      .join("\n");
    expect(text).not.toMatch(/Silverbird Television.?s website/i);
    expect(text).not.toMatch(/silverbirdtv\.com/i);
  });
});
