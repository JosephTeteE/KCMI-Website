/**
 * DOM layout + interactive control discovery for QA1.
 */

import type { Page } from "@playwright/test";
import { classifyControlByName } from "./mutation-policy";
import type { ControlDiscovery, MutationClass } from "./types";

export type OverflowFinding = {
  route: string;
  scenario: string;
  width: number;
  kind: "document" | "element";
  detail: string;
  selector?: string;
};

export async function auditDocumentOverflow(
  page: Page,
  route: string,
  scenario: string,
  width: number,
): Promise<OverflowFinding[]> {
  const findings: OverflowFinding[] = [];
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    findings.push({
      route,
      scenario,
      width,
      kind: "document",
      detail: `horizontal overflow scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
    });
  }
  return findings;
}

export async function discoverInteractiveControls(
  page: Page,
  meta: {
    route: string;
    scenario: string;
    browser: string;
    viewport: string;
  },
): Promise<ControlDiscovery[]> {
  const raw = await page.evaluate(() => {
    const selectors = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "summary",
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="switch"]',
    ];
    const nodes = Array.from(
      document.querySelectorAll(selectors.join(",")),
    ) as HTMLElement[];
    return nodes
      .filter((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .slice(0, 250)
      .map((el) => {
        const role =
          el.getAttribute("role") ||
          el.tagName.toLowerCase().replace("a", "link") ||
          "unknown";
        const name =
          el.getAttribute("aria-label") ||
          (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
          el.textContent?.trim().slice(0, 120) ||
          (el as HTMLInputElement).placeholder ||
          el.getAttribute("name") ||
          "";
        const href = el.tagName === "A" ? (el as HTMLAnchorElement).href : null;
        const box = el.getBoundingClientRect();
        const disabled =
          (el as HTMLButtonElement).disabled === true ||
          el.getAttribute("aria-disabled") === "true";
        return {
          role: role === "a" ? "link" : role,
          name: name.replace(/\s+/g, " ").trim(),
          controlType:
            el.tagName.toLowerCase() === "input"
              ? (el as HTMLInputElement).type || "text"
              : el.tagName.toLowerCase(),
          enabled: !disabled,
          href,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
        };
      });
  });

  return raw.map((item) => {
    const mutation = classifyControlByName(
      item.name,
      item.role,
      item.href,
    ) as MutationClass | "UNCLASSIFIED";
    return {
      ...meta,
      role: item.role,
      name: item.name || "(unnamed)",
      controlType: item.controlType,
      enabled: item.enabled,
      href: item.href,
      box: item.box,
      mutation,
      exercisedBy: null,
    };
  });
}

export async function auditHubTypographySample(
  page: Page,
): Promise<
  Array<{
    selector: string;
    fontSize: number;
    reason: string;
    textSample?: string;
    exempt?: boolean;
  }>
> {
  return page.evaluate(() => {
    const out: Array<{
      selector: string;
      fontSize: number;
      reason: string;
      textSample?: string;
      exempt?: boolean;
    }> = [];
    const candidates = Array.from(
      document.querySelectorAll(
        "button, a, label, input, select, textarea, nav, .hub-help, [data-tour]",
      ),
    ) as HTMLElement[];
    for (const el of candidates.slice(0, 120)) {
      // Scaled orientation thumbnails are exempt from Hub UI floors
      if (
        el.closest(
          "[data-hub-preview-scaled], [data-hub-preview='scaled'], [data-hub-preview]",
        )
      ) {
        continue;
      }
      const style = window.getComputedStyle(el);
      const px = parseFloat(style.fontSize);
      if (!Number.isFinite(px)) continue;
      const isHelp =
        el.classList.contains("hub-help") ||
        (el.textContent ?? "").toLowerCase().includes("optional");
      const isMeta =
        el.classList.contains("hub-meta") ||
        el.tagName === "SMALL" ||
        /\btext-sm\b/.test(el.className);
      const min = isHelp ? 15 : isMeta ? 14 : 16;
      if (px + 0.01 < min && el.tagName !== "SMALL") {
        out.push({
          selector: el.tagName.toLowerCase(),
          fontSize: px,
          reason: `Hub text ${px}px < ${min}px floor`,
          textSample: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        });
      }
    }
    return out;
  });
}

/** Effective touch target: control box ∪ associated label/card. */
export async function auditEffectiveTouchTargets(
  page: Page,
  route: string,
): Promise<{
  audited: number;
  critical: Array<Record<string, unknown>>;
  advisory: Array<Record<string, unknown>>;
}> {
  return page.evaluate((routeName) => {
    const critical: Array<Record<string, unknown>> = [];
    const advisory: Array<Record<string, unknown>> = [];
    let audited = 0;
    const controls = Array.from(
      document.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button']",
      ),
    ) as HTMLElement[];

    function unionHeight(a: DOMRect, b: DOMRect | null) {
      if (!b) return { w: a.width, h: a.height };
      const top = Math.min(a.top, b.top);
      const bottom = Math.max(a.bottom, b.bottom);
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.right, b.right);
      return { w: right - left, h: bottom - top };
    }

    for (const el of controls.slice(0, 100)) {
      if (el.closest("[data-hub-preview-scaled], [data-hub-preview='scaled']")) {
        continue;
      }
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;

      const input = el as HTMLInputElement;
      let labelEl: HTMLElement | null = null;
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
        labelEl =
          input.labels?.[0] ||
          (el.id ? document.querySelector(`label[for="${el.id}"]`) : null) ||
          el.closest("label");
      }
      const labelBox = labelEl?.getBoundingClientRect() || null;
      const effective = unionHeight(box, labelBox);
      const name =
        el.getAttribute("aria-label") ||
        labelEl?.textContent?.trim() ||
        el.textContent?.trim().slice(0, 80) ||
        input.placeholder ||
        "(unnamed)";
      audited += 1;

      const isInlineLink =
        el.tagName === "A" &&
        !el.className.includes("btn") &&
        box.height < 32 &&
        (el.textContent || "").trim().length > 0;

      if (effective.h + 0.5 < 44 && effective.w + 0.5 < 44) {
        const row = {
          route: routeName,
          name: name.replace(/\s+/g, " ").trim().slice(0, 120),
          role: el.tagName.toLowerCase(),
          type: input.type || el.tagName.toLowerCase(),
          glyph: { w: Math.round(box.width), h: Math.round(box.height) },
          effective: { w: Math.round(effective.w), h: Math.round(effective.h) },
          blankName: !name || name === "(unnamed)",
        };
        if (isInlineLink) advisory.push(row);
        else critical.push(row);
      }
    }
    return { audited, critical, advisory };
  }, route);
}
