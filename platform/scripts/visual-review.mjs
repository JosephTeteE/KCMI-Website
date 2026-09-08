/**
 * REVIEW-ONLY contact sheet for candidate Playwright snapshots.
 * Does not modify, copy, or approve PNG files.
 *
 * Usage (from platform/):
 *   node scripts/visual-review.mjs
 *   open e2e/visual-review/index.html
 */

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotDir = join(root, "e2e", "public-visual.spec.ts-snapshots");
const outDir = join(root, "e2e", "visual-review");
const outFile = join(outDir, "index.html");

const PAGE_ROUTES = [
  { id: "home", route: "/" },
  { id: "about", route: "/about" },
  { id: "locations", route: "/locations" },
  { id: "services", route: "/services" },
  { id: "sermons", route: "/sermons" },
  { id: "contact", route: "/contact" },
  { id: "giving", route: "/giving" },
  { id: "livestream", route: "/livestream" },
  { id: "mission", route: "/mission" },
  { id: "faqs", route: "/faqs" },
  { id: "privacy", route: "/privacy" },
  { id: "terms", route: "/terms" },
];

const PAGE_WIDTHS = [
  { key: "390", label: "Mobile ~390" },
  { key: "768", label: "Tablet ~768" },
  { key: "1280", label: "Desktop ~1280" },
];

const FOOTER_WIDTHS = ["320", "390", "768", "1024", "1280", "1440"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function classify(filename) {
  const footer = filename.match(
    /^public-visual-baselines-visual-footer-(\d+)-1-public-darwin\.png$/,
  );
  if (footer) {
    return { kind: "footer", routeId: "footer", width: footer[1], filename };
  }

  const defaultTerms = filename.match(
    /^public-visual-baselines-visual-terms-(\d+)-1-public-darwin\.png$/,
  );
  if (defaultTerms) {
    return { kind: "page", routeId: "terms", width: defaultTerms[1], filename };
  }

  const named = filename.match(
    /^public-([a-z]+)-(\d+)-public-darwin\.png$/,
  );
  if (named) {
    return { kind: "page", routeId: named[1], width: named[2], filename };
  }

  return { kind: "other", filename };
}

const files = readdirSync(snapshotDir)
  .filter((name) => name.endsWith(".png"))
  .sort();

const classified = files.map(classify);
const pages = new Map();
const footers = new Map();
const others = [];

for (const item of classified) {
  if (item.kind === "page") {
    if (!pages.has(item.routeId)) pages.set(item.routeId, new Map());
    pages.get(item.routeId).set(item.width, item.filename);
  } else if (item.kind === "footer") {
    footers.set(item.width, item.filename);
  } else {
    others.push(item.filename);
  }
}

function relSrc(filename) {
  return relative(outDir, join(snapshotDir, filename)).split("\\").join("/");
}

function cell(route, width, filename) {
  if (!filename) {
    return `<figure class="cell missing">
      <div class="placeholder">No candidate screenshot</div>
      <figcaption>
        <strong>${escapeHtml(route)}</strong>
        <span>${escapeHtml(width)}px</span>
        <code>missing</code>
      </figcaption>
    </figure>`;
  }
  const src = relSrc(filename);
  return `<figure class="cell">
      <a href="${escapeHtml(src)}" target="_blank" rel="noopener">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(`${route} at ${width}px — ${filename}`)}">
      </a>
      <figcaption>
        <strong>${escapeHtml(route)}</strong>
        <span>${escapeHtml(width)}px</span>
        <code>${escapeHtml(filename)}</code>
      </figcaption>
    </figure>`;
}

const pageSections = PAGE_ROUTES.map((entry) => {
  const byWidth = pages.get(entry.id) ?? new Map();
  const cards = PAGE_WIDTHS.map((w) =>
    cell(entry.route, w.key, byWidth.get(w.key)),
  ).join("\n");
  return `<section class="route" id="route-${escapeHtml(entry.id)}">
    <h3>${escapeHtml(entry.route === "/" ? "/ (home)" : entry.route)}</h3>
    <div class="row">${cards}</div>
  </section>`;
}).join("\n");

const footerCards = FOOTER_WIDTHS.map((width) =>
  cell("footer /", width, footers.get(width)),
).join("\n");

const otherList =
  others.length === 0
    ? "<p class=\"note\">No unclassified PNGs.</p>"
    : `<ul>${others.map((name) => `<li><code>${escapeHtml(name)}</code></li>`).join("")}</ul>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KCMI D1.2 candidate visual review (NOT APPROVED)</title>
  <style>
    :root {
      --bg: #f4f1f5;
      --card: #fff;
      --ink: #1c1720;
      --muted: #5c5663;
      --line: #d8d0dc;
      --warn: #7c1963;
      --warn-bg: #f6e8f2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    header.banner {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 1rem 1.25rem;
      background: var(--warn-bg);
      border-bottom: 3px solid var(--warn);
    }
    header.banner h1 { margin: 0 0 0.35rem; font-size: 1.25rem; }
    header.banner p { margin: 0.2rem 0; color: var(--muted); }
    .wrap { padding: 1.25rem; max-width: 1400px; margin-inline: auto; }
    h2 { margin: 2rem 0 0.75rem; }
    h3 { margin: 0 0 0.75rem; }
    .route, .footer-block {
      margin-bottom: 1.75rem;
      padding: 1rem;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
    }
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .cell {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: #faf8fb;
    }
    .cell img {
      display: block;
      width: 100%;
      height: 280px;
      object-fit: contain;
      background: #ece8ef;
    }
    .cell a { display: block; }
    figcaption {
      display: grid;
      gap: 0.2rem;
      padding: 0.65rem 0.7rem 0.8rem;
      font-size: 0.85rem;
    }
    figcaption code {
      display: block;
      font-size: 0.72rem;
      word-break: break-all;
      color: var(--muted);
    }
    .missing { outline: 2px dashed var(--warn); }
    .placeholder {
      height: 280px;
      display: grid;
      place-items: center;
      color: var(--warn);
      font-weight: 600;
      text-align: center;
      padding: 1rem;
    }
    .note { color: var(--muted); }
    nav.toc { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 0; }
    nav.toc a {
      color: var(--warn);
      text-decoration: none;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.2rem 0.65rem;
      background: #fff;
    }
  </style>
</head>
<body>
  <header class="banner">
    <h1>Candidate visual screenshots — not approved</h1>
    <p>Development/test review only. These files were generated by the first public visual run. They have not been blessed.</p>
    <p>Do not run <code>--update-snapshots</code> from this page. Click a thumbnail to open the original PNG.</p>
    <p>Inventory: <strong>${files.length}</strong> PNG files in <code>e2e/public-visual.spec.ts-snapshots/</code></p>
  </header>
  <main class="wrap">
    <nav class="toc">
      ${PAGE_ROUTES.map((entry) => `<a href="#route-${escapeHtml(entry.id)}">${escapeHtml(entry.route)}</a>`).join("")}
      <a href="#footer-widths">Footer widths</a>
    </nav>

    <h2>Public routes — mobile / tablet / desktop</h2>
    <p class="note">Expected columns: ~390, ~768, ~1280. Empty cells mean no candidate was generated.</p>
    ${pageSections}

    <h2 id="footer-widths">Footer stress widths</h2>
    <div class="footer-block">
      <p class="note">Expected: 320, 390, 768, 1024, 1280, 1440.</p>
      <div class="row">${footerCards}</div>
    </div>

    <h2>Unclassified files</h2>
    ${otherList}
  </main>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`Wrote ${outFile}`);
console.log(`Open with: open ${relative(root, outFile)}`);
