import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "../qa/manifest";
import { assertNoErrorPage, landmarkMatches } from "../qa/integrity";
import { attachRuntimeAuditors } from "../qa/network-audit";
import { hostnameFromBaseUrl, isProductionHost } from "../qa/mutation-policy";

test.describe("QA1 smoke — public routes", () => {
  for (const route of PUBLIC_ROUTES.filter((r) => r.surface === "PUBLIC")) {
    test(`GET ${route.path}`, async ({ page, baseURL }) => {
      const host = hostnameFromBaseUrl(baseURL ?? "");
      expect(isProductionHost(host)).toBe(false);

      const audit = attachRuntimeAuditors(page, baseURL ?? "http://127.0.0.1");
      const res = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(res?.status() ?? 0, `status for ${route.path}`).toBeLessThan(500);
      const body = await page.locator("body").innerText();
      assertNoErrorPage(body, route.path);
      if (route.landmark) {
        expect(
          landmarkMatches(body, route.landmark),
          `landmark missing on ${route.path}`,
        ).toBe(true);
      }
      const pageErrors = audit.unexpectedPageErrors();
      expect(pageErrors, JSON.stringify(pageErrors)).toEqual([]);
    });
  }
});

test.describe("QA1 smoke — host safety", () => {
  test("production hosts refuse mutating classes", async ({ baseURL }) => {
    const { assertMutationAllowed } = await import("../qa/mutation-policy");
    expect(() =>
      assertMutationAllowed("https://kcmi-rcc.org", "DRAFT_WRITE"),
    ).toThrow(/HOST SAFETY/);
    expect(() =>
      assertMutationAllowed("https://www.kcmi-rcc.org", "PUBLIC_WRITE"),
    ).toThrow(/HOST SAFETY/);
    expect(() =>
      assertMutationAllowed("https://www.kcmi-rcc.org", "DESTRUCTIVE"),
    ).toThrow(/HOST SAFETY/);
    // Preview draft still constrained to STAGING QA titles when title provided
    expect(() =>
      assertMutationAllowed("https://kcmi-preview.josephtete.com", "DRAFT_WRITE", {
        recordTitle: "Real Ministry Program",
      }),
    ).toThrow(/HOSTED STAGING POLICY/);
    expect(() =>
      assertMutationAllowed(baseURL ?? "http://127.0.0.1", "SAFE"),
    ).not.toThrow();
  });
});
