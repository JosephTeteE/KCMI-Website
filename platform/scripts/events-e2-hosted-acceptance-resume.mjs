/**
 * Resume E2 hosted acceptance from known QA draft through publish/edit/archive.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://kcmi-preview.josephtete.com";
const AUTH = resolve(ROOT, ".auth/d17-review-user.json");
const OUT = resolve(ROOT, ".qa-events-e2-acceptance");
const EVENT_ID = "b95f9d0f-9a04-4f6e-acdf-44211a95290c";
const SLUG = "staging-qa-event-editor-test";
const QA_TITLE = "STAGING QA — Event Editor Test";
const QA_TITLE_EDITED = "STAGING QA — Event Editor Test (edited)";
const NAV = { waitUntil: "domcontentloaded", timeout: 90_000 };

const results = {
  publish: null,
  publishedEditSafety: null,
  archive: null,
  auditRevision: null,
  defects: [],
  status: "FAIL",
};

function pass(k, d) {
  results[k] = { ok: true, detail: d };
}
function fail(k, d) {
  results[k] = { ok: false, detail: d };
  results.defects.push(`${k}: ${d}`);
}

async function dismissTour(page) {
  for (const name of [/Skip tour/i, /Skip this step/i, /Finish tour/i, /Close/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await ensureCaptureAuthState({ baseUrl: BASE, authStatePath: AUTH, timeoutMs: 600_000 });
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  try {
    await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
    if (page.url().includes("/auth/")) throw new Error("auth failed");
    await dismissTour(page);

    // Ensure draft then publish
    const restore = page.getByRole("button", { name: /Move back to draft/i });
    if (await restore.isVisible().catch(() => false)) {
      await restore.click();
      await page.waitForTimeout(1200);
      await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
      await dismissTour(page);
    }

    const makeLive = page.getByRole("button", {
      name: /Make this live on the website/i,
    });
    if (!(await makeLive.isVisible().catch(() => false))) {
      fail("publish", "Make this live not visible");
    } else {
      await Promise.all([
        page.waitForURL(/message=|\/admin\/events\//, { timeout: 60_000 }).catch(() => {}),
        makeLive.click(),
      ]);
      await page.waitForTimeout(1500);
      await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
      await dismissTour(page);
      const hubText = await page.locator("body").innerText();
      const hubLive = /Live on website|Currently on the website/i.test(hubText);

      await page.goto(`${BASE}/events`, NAV);
      const indexText = await page.locator("body").innerText();
      const onIndex = new RegExp(QA_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
        indexText,
      );

      const res = await page.goto(`${BASE}/events/${SLUG}`, NAV);
      const detailStatus = res?.status() ?? 0;
      const detailText = await page.locator("body").innerText();
      const detailOk =
        detailStatus === 200 &&
        new RegExp(QA_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
          detailText,
        );
      const hasReg =
        /Register now|Upload receipt|payment account|₦30,000/i.test(detailText);
      await page.screenshot({
        path: resolve(OUT, "03-public-published.png"),
        fullPage: true,
      });

      if (hubLive && onIndex && detailOk && !hasReg) {
        pass("publish", `live hub+public; slug=${SLUG}; no reg/payment UI`);
      } else {
        fail(
          "publish",
          `hubLive=${hubLive} onIndex=${onIndex} detailOk=${detailOk} status=${detailStatus} hasReg=${hasReg}`,
        );
      }
    }

    // Published edit safety
    await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
    await dismissTour(page);
    const unlock = page.getByRole("button", { name: /Change this event/i });
    if (await unlock.isVisible().catch(() => false)) await unlock.click();

    await page.getByRole("button", { name: /1\.\s*Details/i }).click();
    await page.locator("#title_ui").fill(QA_TITLE_EDITED);

    const before = await context.newPage();
    await before.goto(`${BASE}/events/${SLUG}`, NAV);
    const beforeText = await before.locator("body").innerText();
    const stillCurrent =
      new RegExp(QA_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
        beforeText,
      ) && !/\(edited\)/i.test(beforeText);
    await before.close();

    await page.getByRole("button", { name: /6\.\s*Review/i }).click();
    await page.getByRole("button", { name: /Preview my changes/i }).click();
    await page.waitForTimeout(400);
    await page.getByTestId("event-make-live").click();
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
    await dismissTour(page);

    const after = await context.newPage();
    await after.goto(`${BASE}/events/${SLUG}`, NAV);
    const afterText = await after.locator("body").innerText();
    const nowEdited = /\(edited\)/i.test(afterText);
    await after.close();

    if (stillCurrent && nowEdited) {
      pass(
        "publishedEditSafety",
        "public kept pre-edit title until Make these changes live",
      );
    } else {
      fail(
        "publishedEditSafety",
        `stillCurrent=${stillCurrent} nowEdited=${nowEdited}`,
      );
    }

    // Archive
    await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
    await dismissTour(page);
    const remove = page.getByRole("button", {
      name: /Remove from public website/i,
    });
    if (!(await remove.isVisible().catch(() => false))) {
      fail("archive", "Remove button missing");
    } else {
      page.once("dialog", (d) => d.accept());
      await remove.click();
      await page.waitForTimeout(2000);
      await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
      await dismissTour(page);
      const hubArch = await page.locator("body").innerText();
      const archivedUi = /Removed from public website/i.test(hubArch);

      await page.goto(`${BASE}/events`, NAV);
      const idx = await page.locator("body").innerText();
      const gone = !new RegExp(
        QA_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      ).test(idx);

      const slugRes = await page.goto(`${BASE}/events/${SLUG}`, NAV);
      const slugStatus = slugRes?.status() ?? 0;
      const slugText = await page.locator("body").innerText();
      const slugSafe =
        slugStatus === 404 ||
        /could not be found|404/i.test(slugText) ||
        !/\(edited\)|STAGING QA — Event Editor Test/i.test(slugText);

      await page.goto(`${BASE}/admin/events/${EVENT_ID}`, NAV);
      const stillHub = /STAGING QA — Event Editor Test/i.test(
        await page.locator("body").innerText(),
      );

      // Leave archived (do not restore) so public stays clean
      if (archivedUi && gone && slugSafe && stillHub) {
        pass(
          "archive",
          "archived; public index/slug gone; Hub record remains; left archived",
        );
      } else {
        fail(
          "archive",
          `archivedUi=${archivedUi} gone=${gone} slugSafe=${slugSafe} status=${slugStatus} stillHub=${stillHub}`,
        );
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const sql = `
select action from public.audit_events
where entity_type='event' and entity_id='${EVENT_ID}'
order by created_at;
select change_summary from public.content_revisions
where entity_type='event' and entity_id='${EVENT_ID}'
order by revision_number;
`;
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", sql], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const hasPublish = /event\.publish/.test(out);
  const hasUpdateLive = /event\.update_live/.test(out);
  const hasArchive = /event\.archive/.test(out);
  const hasReg = /registration|payment_evidence|receipt/i.test(out);
  if (hasPublish && hasUpdateLive && hasArchive && !hasReg) {
    pass(
      "auditRevision",
      "publish + update_live + archive present; no reg/payment data",
    );
  } else {
    fail(
      "auditRevision",
      `publish=${hasPublish} update_live=${hasUpdateLive} archive=${hasArchive} hasReg=${hasReg}`,
    );
  }

  results.status = ["publish", "publishedEditSafety", "archive", "auditRevision"].every(
    (k) => results[k]?.ok,
  )
    ? "PASS"
    : "FAIL";

  const prevPath = resolve(OUT, "results.json");
  let merged = { ...results };
  if (existsSync(prevPath)) {
    try {
      const prev = JSON.parse(
        await import("node:fs").then((fs) =>
          fs.readFileSync(prevPath, "utf8"),
        ),
      );
      merged = {
        ...prev,
        ...results,
        defects: [...(prev.defects || []).filter((d) => !String(d).startsWith("publish") && !String(d).startsWith("published") && !String(d).startsWith("archive") && !String(d).startsWith("audit")), ...results.defects],
      };
      const keys = [
        "adminEvents",
        "permission",
        "createDraft",
        "reopenEdit",
        "preview",
        "publish",
        "publishedEditSafety",
        "archive",
        "auditRevision",
      ];
      merged.status = keys.every((k) => merged[k]?.ok) ? "PASS" : "FAIL";
    } catch {
      /* keep results */
    }
  }
  writeFileSync(resolve(OUT, "results-resume.json"), JSON.stringify(results, null, 2));
  writeFileSync(resolve(OUT, "results.json"), JSON.stringify(merged, null, 2));
  console.log(JSON.stringify(merged, null, 2));
  process.exitCode = merged.status === "PASS" ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
