/**
 * Writes a gitignored Care P1 visual review package with synthetic HTML screens.
 * Does not expand QA infrastructure. No real pastoral content.
 *
 * Usage (from platform/):
 *   node scripts/write-care-p1-review-package.mjs
 *
 * Output: platform/.qa-care-p1-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), ".qa-care-p1-review");

const shell = (title, body) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} — Care P1 review</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; background: #eff5f5; color: #1a1a1a; }
    .chrome { display: flex; min-height: 100vh; }
    nav { width: 220px; background: #fff; border-right: 1px solid #d5e0e0; padding: 1.25rem; }
    main { flex: 1; padding: 2rem; }
    h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
    .muted { color: #5a6a6a; }
    .tabs a { display: inline-block; padding: 0.6rem 0.9rem; margin-right: 0.35rem; text-decoration: none; color: inherit; border-radius: 6px; }
    .tabs a.active { background: #eff5f5; color: #b60b13; font-weight: 700; }
    .card { background: #fff; border: 1px solid #d5e0e0; border-radius: 10px; padding: 1rem 1.25rem; margin-top: 1rem; }
    .narrative { border: 2px solid #b60b13; background: #fdf2f2; border-radius: 10px; padding: 1rem 1.25rem; margin-top: 1rem; }
    .deny { max-width: 36rem; margin: 3rem auto; background: #fff; border: 1px solid #d5e0e0; border-radius: 10px; padding: 2rem; }
    .mono { font-family: ui-monospace, monospace; font-weight: 700; }
    .badge { display: inline-block; background: #108c1d; color: #fff; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

const screens = [
  [
    "01-care-landing-authorized.html",
    "Care landing (authorized)",
    shell(
      "Care landing",
      `<div class="chrome"><nav><p><strong>KCMI Hub</strong></p><p class="muted">Pastoral Admin</p><p>Care ✓</p></nav>
      <main>
        <p class="tabs"><a class="active" href="#">Overview</a><a href="#">Prayer</a><a href="#">Pastoral Care</a><a href="#">Welfare</a></p>
        <h1>Care</h1>
        <p class="muted">Private prayer, pastoral care, and welfare requests. Visitor intake still uses Google Forms.</p>
        <div class="card"><h2>Prayer</h2><p class="muted">Open the Prayer queue</p></div>
        <div class="card"><h2>Pastoral Care</h2><p class="muted">Open the Pastoral Care queue</p></div>
        <div class="card"><h2>Welfare</h2><p class="muted">Open the Welfare queue</p></div>
      </main></div>`,
    ),
  ],
  [
    "02-prayer-queue-empty.html",
    "Prayer queue empty",
    shell(
      "Prayer queue",
      `<div class="chrome"><nav><p><strong>Care</strong></p></nav><main>
      <p class="tabs"><a href="#">Overview</a><a class="active" href="#">Prayer</a><a href="#">Pastoral Care</a><a href="#">Welfare</a></p>
      <h1>Prayer</h1>
      <div class="card muted">No requests yet. Visitor Care forms still use Google Forms until a later phase.</div>
      </main></div>`,
    ),
  ],
  [
    "03-pastoral-queue-synthetic.html",
    "Pastoral queue synthetic",
    shell(
      "Pastoral queue",
      `<div class="chrome"><nav><p><strong>Care</strong></p></nav><main>
      <p class="tabs"><a href="#">Overview</a><a href="#">Prayer</a><a class="active" href="#">Pastoral Care</a><a href="#">Welfare</a></p>
      <h1>Pastoral Care</h1>
      <div class="card"><span class="mono">KCMI-CARE-A1B2C3</span> · New · Synthetic Visitor<br/><span class="muted">List view shows metadata only — not the narrative.</span></div>
      </main></div>`,
    ),
  ],
  [
    "04-welfare-queue.html",
    "Welfare queue",
    shell(
      "Welfare queue",
      `<div class="chrome"><nav><p><strong>Care</strong></p></nav><main>
      <p class="tabs"><a href="#">Overview</a><a href="#">Prayer</a><a href="#">Pastoral Care</a><a class="active" href="#">Welfare</a></p>
      <h1>Welfare</h1>
      <div class="card muted">No requests yet.</div>
      </main></div>`,
    ),
  ],
  [
    "05-request-detail-authorized.html",
    "Authorized request detail",
    shell(
      "Request detail",
      `<div class="chrome"><nav><p><strong>Care</strong></p></nav><main>
      <h1 class="mono">KCMI-CARE-A1B2C3</h1>
      <p class="muted">Highly sensitive Care request. Opening is audited. <span class="badge">SYNTHETIC</span></p>
      <div class="card">Domain: Pastoral Care · Status: New · Email: synthetic.care@example.invalid</div>
      <div class="narrative"><strong>Visitor narrative</strong><p class="muted">Highly sensitive. Do not copy into email, chat, or public pages.</p><p>SYNTHETIC FIXTURE — Requesting a pastoral conversation about family encouragement. (Not a real request.)</p></div>
      <div class="card"><strong>Internal staff notes</strong><p class="muted">No notes yet.</p><p>Status: New → In progress · Assignment controls for assign holders</p></div>
      </main></div>`,
    ),
  ],
  [
    "06-unauthorized-denied.html",
    "Unauthorized denied",
    shell(
      "Denied",
      `<div class="deny"><h1>Care</h1><p class="muted">Your account cannot open Care requests. Ask a Pastoral Admin if you need access.</p><p class="muted">No Care nav · No dashboard counts · No request references.</p></div>`,
    ),
  ],
  [
    "07-notes-status-ui.html",
    "Notes and status UI",
    shell(
      "Notes/status",
      `<div class="chrome"><nav><p><strong>Care</strong></p></nav><main>
      <h1 class="mono">KCMI-CARE-A1B2C3</h1>
      <div class="card"><label>Status <select><option>New</option><option selected>In progress</option><option>Closed</option></select></label>
      <p class="muted">Reopen requires domain assign authority.</p></div>
      <div class="card"><strong>Internal staff notes</strong>
      <p>SYNTHETIC note: Called visitor; scheduled follow-up. (Not real.)</p>
      <p class="muted">Audit records note added — never the note body.</p>
      <textarea rows="3" placeholder="Add a short note"></textarea>
      </div>
      </main></div>`,
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
    `<!doctype html><html><body>
    <h1>Care P1 review package</h1>
    <p>Gitignored synthetic screens only. No real pastoral content. No public forms.</p>
    <ol>${links.join("")}</ol>
    </body></html>`,
    "utf8",
  );
  console.log(`Wrote ${screens.length} screens to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
