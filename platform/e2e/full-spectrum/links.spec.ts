import { expect, test } from "@playwright/test";
import { classifyLink } from "../qa/content-audit";
import { APPROVED_EXTERNAL_HOSTS } from "../qa/mutation-policy";

test.describe("QA1 links", () => {
  test("no javascript: in primary public nav sample", async ({ page, baseURL }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("header a[href], nav a[href], footer a[href]").evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href") || ""),
    );
    for (const href of hrefs) {
      const check = classifyLink(href, baseURL ?? "http://127.0.0.1");
      expect(check.kind, href).not.toBe("javascript");
      expect(check.ok, `${href} ${check.detail}`).toBe(true);
    }
  });

  test("approved external host registry is non-empty", () => {
    expect(APPROVED_EXTERNAL_HOSTS.length).toBeGreaterThan(3);
  });
});
