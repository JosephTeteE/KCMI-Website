import { expect, test } from "@playwright/test";
import { attachRuntimeAuditors } from "../qa/network-audit";
import { PUBLIC_ROUTES } from "../qa/manifest";

test.describe("QA1 runtime / network", () => {
  for (const route of PUBLIC_ROUTES.filter((r) =>
    ["/", "/about", "/locations", "/livestream", "/contact"].includes(r.path),
  )) {
    test(`no pageerror on ${route.path}`, async ({ page, baseURL }) => {
      const audit = attachRuntimeAuditors(page, baseURL ?? "http://127.0.0.1");
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => undefined);
      expect(audit.unexpectedPageErrors()).toEqual([]);
      const firstParty = audit.unexpectedFirstPartyFailures();
      expect(firstParty, JSON.stringify(firstParty)).toEqual([]);
    });
  }
});
