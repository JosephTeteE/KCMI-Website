import { describe, expect, it } from "vitest";
import {
  groupBranchesByCountry,
  publicPlaceLabel,
  sortCountriesForPresentation,
} from "@/content/branch-groups";
import {
  getBranchBySlug,
  getBranches,
  getFooterLegalNavigation,
  getFooterNavigation,
} from "@/content";
import type { Branch } from "@/content/types";

function branch(partial: Partial<Branch> & Pick<Branch, "slug" | "name">): Branch {
  return {
    id: partial.id ?? partial.slug,
    slug: partial.slug,
    name: partial.name,
    cityLabel: partial.cityLabel ?? "",
    country: partial.country ?? null,
    addressLines: partial.addressLines ?? [],
    phones: partial.phones ?? [],
    serviceTimes: partial.serviceTimes ?? [],
  };
}

describe("groupBranchesByCountry", () => {
  it("orders Nigeria, Ghana, then Togo and does not invent a country", () => {
    const groups = groupBranchesByCountry([
      branch({ slug: "accra", name: "Accra", country: "Ghana" }),
      branch({ slug: "hq", name: "HQ", country: "Nigeria" }),
      branch({ slug: "lome", name: "Lomé", country: "Togo" }),
      branch({ slug: "pending", name: "Pending" }),
    ]);
    expect(groups.map((g) => g.heading)).toEqual([
      "Nigeria",
      "Ghana",
      "Togo",
      "Additional locations",
    ]);
    expect(groups[3]?.country).toBeNull();
  });
});

describe("publicPlaceLabel", () => {
  it("formats listing and detail place lines without repeating country", () => {
    expect(publicPlaceLabel("Port Harcourt, Nigeria", "Nigeria")).toBe(
      "Port Harcourt, Nigeria",
    );
    expect(publicPlaceLabel("Accra, Ghana", "Ghana")).toBe("Accra, Ghana");
    expect(publicPlaceLabel("Lomé, Togo", "Togo")).toBe("Lomé, Togo");
    expect(publicPlaceLabel("Accra", "Ghana")).toBe("Accra · Ghana");
    expect(publicPlaceLabel("Port Harcourt, Nigeria", "Nigeria")).not.toMatch(
      /Nigeria\s*[·•]\s*Nigeria/i,
    );
  });
});

describe("sortCountriesForPresentation", () => {
  it("orders Nigeria, Ghana, Togo regardless of input order", () => {
    expect(sortCountriesForPresentation(["Togo", "Nigeria", "Ghana"])).toEqual([
      "Nigeria",
      "Ghana",
      "Togo",
    ]);
    expect(sortCountriesForPresentation(["Ghana", "Togo", "Nigeria"])).toEqual([
      "Nigeria",
      "Ghana",
      "Togo",
    ]);
  });

  it("keeps unknown countries after verified known order", () => {
    expect(
      sortCountriesForPresentation(["Kenya", "Togo", "Nigeria", "Ghana"]),
    ).toEqual(["Nigeria", "Ghana", "Togo", "Kenya"]);
  });
});

describe("future branch slug adapter", () => {
  it("resolves headquarters by slug from seed", async () => {
    const hq = await getBranchBySlug("headquarters");
    expect(hq?.slug).toBe("headquarters");
    expect(hq?.country).toBe("Nigeria");
    expect(await getBranchBySlug("missing-branch")).toBeNull();
  });

  it("keeps verified countries on published seed branches", async () => {
    const all = await getBranches();
    expect(all.every((item) => item.country)).toBe(true);
    expect(new Set(all.map((item) => item.country))).toEqual(
      new Set(["Nigeria", "Ghana", "Togo"]),
    );
  });
});

describe("footer legal navigation", () => {
  it("keeps Privacy and Terms out of Explore", () => {
    const explore = getFooterNavigation().map((item) => item.href);
    expect(explore).not.toContain("/privacy");
    expect(explore).not.toContain("/terms");
    expect(getFooterLegalNavigation().map((item) => item.href)).toEqual([
      "/privacy",
      "/terms",
    ]);
  });
});
