/**
 * Gitignored Care P3 Pastoral + Welfare review package (synthetic HTML only).
 * Usage: node scripts/write-care-p3-review-package.mjs
 * Output: platform/.qa-care-p3-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), ".qa-care-p3-review");

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
body{margin:0;font-family:Georgia,serif;background:#eff5f5;color:#1a1a1a}
.wrap{max-width:40rem;margin:0 auto;padding:2rem 1.25rem}
h1{font-size:1.75rem}.muted{color:#5a6a6a}
.card{background:#fff;border:1px solid #d5e0e0;border-radius:10px;padding:1.25rem;margin-top:1rem}
label{display:block;margin-top:1rem;font-weight:600}
input,textarea,select{width:100%;min-height:2.75rem;margin-top:.35rem;padding:.5rem;border:1px solid #d5e0e0;border-radius:6px;box-sizing:border-box}
textarea{min-height:8rem}
.btn{display:inline-flex;min-height:2.75rem;align-items:center;margin-top:1rem;padding:0 1.25rem;background:#b60b13;color:#fff;border:0;border-radius:6px;font-weight:700}
.mono{font-family:ui-monospace,monospace;font-weight:700}
.secondary{font-size:.9rem;color:#5a6a6a;font-weight:500}
</style></head><body><div class="wrap">${body}</div></body></html>`;

const screens = [
  [
    "01-pastoral-care-desktop.html",
    "/pastoral-care desktop",
    shell(
      "Pastoral Care desktop",
      `<p class="muted">Care</p><h1>Pastoral Care</h1><div class="card"><p>Authorized Pastoral Care staff · share only what is necessary · not emergency/therapy</p></div><div class="card"><h2>Request Pastoral Care</h2><p class="muted">Form shown when intake enabled for review</p></div>`,
    ),
  ],
  [
    "02-pastoral-form-mobile.html",
    "Pastoral form mobile",
    shell(
      "Pastoral mobile",
      `<h1>Pastoral Care</h1><div class="card"><label>Name *</label><input/><label>Phone *</label><input/><label>Email (optional)</label><input/><label>Reason *</label><textarea></textarea><label>Preferred way *</label><p>In person / By phone</p><label>Preferred time *</label><input/><label class="secondary">Additional information (optional)</label><textarea></textarea><button class="btn">Submit</button></div>`,
    ),
  ],
  [
    "03-pastoral-confirmation.html",
    "Pastoral confirmation",
    shell(
      "Pastoral confirmation",
      `<div class="card"><h1>Pastoral Care request received</h1><p class="muted">Synthetic only</p><p class="mono">Reference: KCMI-CARE-PAST01</p></div>`,
    ),
  ],
  [
    "04-welfare-desktop.html",
    "/welfare desktop",
    shell(
      "Welfare desktop",
      `<p class="muted">Care</p><h1>Welfare</h1><div class="card"><p>Authorized Welfare staff · no documents required · not emergency</p></div><div class="card"><h2>Request Welfare support</h2></div>`,
    ),
  ],
  [
    "05-welfare-form-mobile.html",
    "Welfare form mobile",
    shell(
      "Welfare mobile",
      `<h1>Welfare</h1><div class="card"><label>Name *</label><input/><label>Phone *</label><input/><label>Email (optional)</label><input/><label>Type of request *</label><select><option>Food</option></select><label>Description *</label><textarea></textarea><label class="secondary">Additional (optional)</label><textarea></textarea><button class="btn">Submit</button></div>`,
    ),
  ],
  [
    "06-welfare-confirmation.html",
    "Welfare confirmation",
    shell(
      "Welfare confirmation",
      `<div class="card"><h1>Welfare request received</h1><p class="mono">Reference: KCMI-CARE-WELF01</p><p class="muted">Synthetic only</p></div>`,
    ),
  ],
  [
    "07-hub-pastoral-queue-detail.html",
    "Care Pastoral queue/detail",
    shell(
      "Hub Pastoral",
      `<h1>Pastoral Care</h1><div class="card"><span class="mono">KCMI-CARE-PAST01</span> · New · metadata only in list</div><div class="card" style="border:2px solid #b60b13"><strong>Visitor narrative</strong><p>STAGING QA — Pastoral synthetic. Detail only with AAL2 + counselling access.</p></div>`,
    ),
  ],
  [
    "08-hub-welfare-queue-detail.html",
    "Care Welfare queue/detail",
    shell(
      "Hub Welfare",
      `<h1>Welfare</h1><div class="card"><span class="mono">KCMI-CARE-WELF01</span> · Food · New</div><div class="card" style="border:2px solid #b60b13"><strong>Visitor narrative</strong><p>STAGING QA — Welfare synthetic.</p></div>`,
    ),
  ],
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const links = [];
  for (const [file, label, html] of screens) {
    await writeFile(path.join(OUT, file), html, "utf8");
    links.push(`<li><a href="${file}">${label}</a></li>`);
  }
  await writeFile(
    path.join(OUT, "README.html"),
    `<!doctype html><html><body><h1>Care P3 Pastoral + Welfare review</h1><p>Synthetic only. Google Forms remain live CTAs. Intake gates default OFF.</p><ol>${links.join("")}</ol></body></html>`,
  );
  console.log(`Wrote ${screens.length} screens to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
