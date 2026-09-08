import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type LayoutMetrics = {
  overflowX: boolean;
  scrollW: number;
  clientW: number;
  headerBottom: number;
  mainTop: number;
  headerCollidesMain: boolean;
  headerFooterOverlap: boolean;
  footerRegionOverlap: boolean;
  clippedImportant: number;
  linksOutside: number;
};

export async function collectLayoutMetrics(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const clientW = doc.clientWidth;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const overflowX = scrollW > clientW + 1;

    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const main =
      document.querySelector("main") ?? document.querySelector("#main-content");

    const headerBox = header?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    const mainBox = main?.getBoundingClientRect();

    const headerBottom = headerBox?.bottom ?? 0;
    const mainTop = mainBox?.top ?? 0;

    const headerCollidesMain = !!(
      headerBox &&
      mainBox &&
      headerBox.bottom > mainBox.top + 2 &&
      window.scrollY < 2
    );

    const headerFooterOverlap = !!(
      headerBox &&
      footerBox &&
      headerBox.bottom > footerBox.top + 2 &&
      headerBox.top < footerBox.bottom
    );

    const regionSelectors = [
      ".site-footer-brand",
      ".site-footer-explore",
      ".site-footer-contact",
      ".site-footer-connect",
    ];
    const regions = regionSelectors
      .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
      .filter((box): box is DOMRect => !!box && box.width > 0 && box.height > 0);

    let footerRegionOverlap = false;
    for (let i = 0; i < regions.length; i += 1) {
      for (let j = i + 1; j < regions.length; j += 1) {
        const a = regions[i]!;
        const b = regions[j]!;
        const overlapX = a.left < b.right - 2 && a.right > b.left + 2;
        const overlapY = a.top < b.bottom - 2 && a.bottom > b.top + 2;
        if (overlapX && overlapY) footerRegionOverlap = true;
      }
    }

    const important = [
      ...document.querySelectorAll(
        "h1, h2, a, button, [role='button'], .site-footer, main",
      ),
    ];
    let clippedImportant = 0;
    let linksOutside = 0;
    for (const el of important) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > clientW + 2 || r.left < -2) {
        clippedImportant += 1;
        if (el.matches("a, button, [role='button']")) linksOutside += 1;
      }
    }

    return {
      overflowX,
      scrollW,
      clientW,
      headerBottom,
      mainTop,
      headerCollidesMain,
      headerFooterOverlap,
      footerRegionOverlap,
      clippedImportant,
      linksOutside,
    };
  });
}

export async function assertPublicLayout(page: Page, label: string) {
  const metrics = await collectLayoutMetrics(page);
  expect(metrics.overflowX, `${label}: unexpected horizontal overflow`).toBe(
    false,
  );
  expect(
    metrics.headerCollidesMain,
    `${label}: header collides with content at rest`,
  ).toBe(false);
  expect(
    metrics.headerFooterOverlap,
    `${label}: header overlaps footer`,
  ).toBe(false);
  expect(
    metrics.footerRegionOverlap,
    `${label}: footer regions overlap`,
  ).toBe(false);
  expect(
    metrics.clippedImportant,
    `${label}: important content clipped (${metrics.clippedImportant})`,
  ).toBe(0);
  expect(
    metrics.linksOutside,
    `${label}: links/buttons outside usable region`,
  ).toBe(0);

  const footer = page.locator("footer.site-footer");
  await expect(footer, `${label}: footer missing`).toBeVisible();
  await expect(
    page.locator(".site-footer-brand"),
    `${label}: brand missing`,
  ).toBeVisible();
  await expect(
    footer.getByRole("heading", { name: "Explore", exact: true }),
    `${label}: explore heading`,
  ).toBeVisible();
  await expect(
    footer.getByRole("heading", { name: "Contact", exact: true }),
    `${label}: contact heading`,
  ).toBeVisible();
  await expect(
    footer.getByRole("heading", { name: "Daily Faith Recharge", exact: true }),
    `${label}: DFR heading`,
  ).toBeVisible();
}

export async function assertFooterContract(page: Page, year: number) {
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("link", { name: /Contact KCMI/i })).toBeVisible();
  await expect(footer).not.toContainText("@gmail.com");
  await expect(footer).not.toContainText("WhatsApp");
  await expect(footer.locator(".site-footer-explore")).not.toContainText("Privacy");
  await expect(footer.locator(".site-footer-explore")).not.toContainText("Terms");
  await expect(
    footer.locator(".site-footer-legal").getByRole("link", { name: "Privacy", exact: true }),
  ).toBeVisible();
  await expect(
    footer.locator(".site-footer-legal").getByRole("link", { name: "Terms", exact: true }),
  ).toBeVisible();
  await expect(footer.locator(".site-footer-legal-line")).toContainText(
    `© ${year} Kingdom Covenant Ministries International · Rehoboth Christian Center`,
  );
}
