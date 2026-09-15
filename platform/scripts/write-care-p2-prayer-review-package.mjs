/**
 * Gitignored Care P2 Prayer review package (synthetic HTML only).
 * Usage: node scripts/write-care-p2-prayer-review-package.mjs
 * Output: platform/.qa-care-p2-prayer-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), ".qa-care-p2-prayer-review");

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
.err{color:#b60b13;border:1px solid #b60b13;background:#fdf2f2;padding:.75rem;border-radius:6px}
.mono{font-family:ui-monospace,monospace;font-weight:700}
</style></head><body><div class="wrap">${body}</div></body></html>`;

const screens = [
  ["01-prayer-page-desktop.html", " /prayer desktop", shell("Prayer desktop", `<p class="muted">Care</p><h1>Prayer requests</h1><p class="muted">1 Timothy 2:1 · calm public page</p><div class="card"><p>Before you share… authorized Prayer staff · not emergency</p></div><div class="card"><h2>Share a prayer request</h2><p class="muted">Form (intake enabled for review)</p></div>`)],
  ["02-prayer-form-mobile.html", "Prayer form mobile", shell("Prayer mobile", `<h1>Prayer requests</h1><div class="card"><label>Prayer request *</label><textarea></textarea><label>Prayer call?</label><p>Yes / No</p><label>Name</label><input/><label>Phone</label><input/><label>Email (optional)</label><input/><button class="btn">Submit</button></div>`)],
  ["03-anonymous-no-contact.html", "Anonymous / no contact", shell("Anonymous", `<h1>Anonymous allowed</h1><div class="card"><p>Prayer call: <strong>No</strong></p><p class="muted">Name / phone / email left empty → stored as null. No fake “Anonymous” values.</p><textarea>STAGING QA — Please pray for wisdom. Synthetic only.</textarea><button class="btn">Submit</button></div>`)],
  ["04-prayer-call-required.html", "Prayer call contact required", shell("Contact required", `<h1>Prayer call = Yes</h1><div class="card"><p>Name * and Phone * required. Email optional.</p><label>Name *</label><input value="STAGING QA"/><label>Phone *</label><input value="+234 800 000 0000"/><button class="btn">Submit</button></div>`)],
  ["05-validation-error.html", "Validation error", shell("Validation", `<h1>Validation</h1><div class="card"><p class="err">Please check the highlighted fields.</p><label>Name *</label><input/><p style="color:#b60b13">Name is required for a prayer call.</p></div>`)],
  ["06-success-confirmation.html", "Success confirmation", shell("Success", `<div class="card"><h1>Prayer request received</h1><p class="muted">Thank you. Your request has been received privately.</p><p class="mono">Reference: KCMI-CARE-ABCDEF</p><p class="muted">Synthetic confirmation — not a real submission.</p></div>`)],
  ["07-hub-prayer-queue.html", "Hub Prayer queue", shell("Hub queue", `<h1>Prayer</h1><p class="muted">List shows metadata only</p><div class="card"><span class="mono">KCMI-CARE-ABCDEF</span> · New · Submitted …</div>`)],
  ["08-hub-prayer-detail.html", "Hub Prayer detail", shell("Hub detail", `<h1 class="mono">KCMI-CARE-ABCDEF</h1><div class="card">Domain: Prayer · Status: New</div><div class="card" style="border:2px solid #b60b13"><strong>Visitor narrative</strong><p>STAGING QA — Please pray. Synthetic only.</p></div>`)],
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
    `<!doctype html><html><body><h1>Care P2 Prayer review</h1><p>Synthetic only. Google Form remains live CTA.</p><ol>${links.join("")}</ol></body></html>`,
    "utf8",
  );
  console.log(`Wrote ${screens.length} screens to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
