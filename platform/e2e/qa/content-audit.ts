/**
 * Content quality flags — automation FLAGS only; never rewrites ministry copy.
 */

export type ContentFlag = {
  route: string;
  pattern: string;
  excerpt: string;
};

const FLAGS: Array<{ name: string; pattern: RegExp }> = [
  { name: "lorem-ipsum", pattern: /lorem ipsum/i },
  { name: "todo", pattern: /\bTODO\b/ },
  { name: "placeholder", pattern: /\bPLACEHOLDER\b/ },
  { name: "test-email", pattern: /test@example/i },
  { name: "raw-uuid", pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i },
  { name: "undefined-literal", pattern: /\bundefined\b/ },
  { name: "null-literal", pattern: /\bnull\b/ },
  { name: "click-here", pattern: /\bclick here\b/i },
  {
    name: "missing-data-apology",
    pattern: /service times will be (listed|published)/i,
  },
];

export function auditContentText(route: string, bodyText: string): ContentFlag[] {
  const flags: ContentFlag[] = [];
  for (const { name, pattern } of FLAGS) {
    const m = bodyText.match(pattern);
    if (!m) continue;
    const idx = m.index ?? 0;
    flags.push({
      route,
      pattern: name,
      excerpt: bodyText.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, " "),
    });
  }
  return flags;
}

export type LinkCheck = {
  href: string;
  kind: "internal" | "external" | "mailto" | "tel" | "hash" | "javascript" | "other";
  ok: boolean;
  detail?: string;
};

export function classifyLink(href: string, baseUrl: string): LinkCheck {
  if (href.startsWith("javascript:")) {
    return { href, kind: "javascript", ok: false, detail: "javascript: URL" };
  }
  if (href.startsWith("mailto:")) {
    const ok = /^mailto:[^\s]+@[^\s]+$/i.test(href);
    return { href, kind: "mailto", ok, detail: ok ? undefined : "invalid mailto" };
  }
  if (href.startsWith("tel:")) {
    const ok = /^tel:[+\d][\d\s()-]*$/i.test(href);
    return { href, kind: "tel", ok };
  }
  if (href.startsWith("#")) {
    return { href, kind: "hash", ok: true };
  }
  try {
    const abs = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    if (abs.hostname === base.hostname) {
      if (/\/qa\//i.test(abs.pathname)) {
        return {
          href: abs.pathname,
          kind: "internal",
          ok: false,
          detail: "QA route leaked into navigation candidate",
        };
      }
      return { href: abs.pathname + abs.search, kind: "internal", ok: true };
    }
    return { href: abs.origin + abs.pathname, kind: "external", ok: true };
  } catch {
    return { href, kind: "other", ok: false, detail: "unparseable" };
  }
}
