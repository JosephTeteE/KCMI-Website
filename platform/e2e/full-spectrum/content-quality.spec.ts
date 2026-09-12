import { expect, test } from "@playwright/test";
import { auditContentText, classifyLink } from "../qa/content-audit";
import { PUBLIC_ROUTES } from "../qa/manifest";

test.describe("QA1 content quality", () => {
  for (const route of PUBLIC_ROUTES.slice(0, 8)) {
    test(`flags ${route.path}`, async ({ page, baseURL }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const body = await page.locator("body").innerText();
      const flags = auditContentText(route.path, body).filter(
        (f) => f.pattern !== "null-literal" && f.pattern !== "undefined-literal",
      );
      // null/undefined as English words can false-positive; keep severe patterns
      const severe = flags.filter((f) =>
        ["lorem-ipsum", "todo", "placeholder", "test-email", "raw-uuid", "missing-data-apology"].includes(
          f.pattern,
        ),
      );
      expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
      void baseURL;
    });
  }
});

test.describe("QA1 internal links sample", () => {
  test("homepage internal links resolve shape", async ({ page, baseURL }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("a[href]").evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") || ""),
    );
    const checks = hrefs
      .filter(Boolean)
      .slice(0, 40)
      .map((h) => classifyLink(h, baseURL ?? "http://127.0.0.1"));
    const bad = checks.filter((c) => !c.ok);
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
});
