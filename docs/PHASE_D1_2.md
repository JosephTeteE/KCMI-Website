# Phase D1.2 — UI hardening, footer redesign, visual regression

Scope stops at D1.2. D2, Giving management, and pastoral workflows were not started.

## Playwright setup

- Dev/test only: `@playwright/test` and `@axe-core/playwright`.
- Production runtime does **not** depend on Playwright.
- **Browser:** installed Google Chrome (`channel: "chrome"`).
- Playwright’s bundled Chromium is **unsupported** on this older Intel Mac / macOS 13 combination (`Playwright does not support chromium on mac13`). Do not run `npx playwright install chromium` expecting it to work here.
- Commands (from `platform/`):

```bash
npm run build
npm run test:e2e      # structural, stress, a11y, Hub smoke
npm run test:visual   # screenshot assertions (does not auto-bless)
npm run test:ui       # Playwright UI mode
```

Inspect a previous HTML report:

```bash
npx playwright show-report
```

Missing baselines are written once (`updateSnapshots: missing`). Changing existing screenshots is an explicit action:

```bash
UPDATE_SNAPSHOTS=1 npx playwright test e2e/public-visual.spec.ts
# or
npx playwright test e2e/public-visual.spec.ts --update-snapshots
```

## Text resize vs browser zoom

Automated tests may apply `html { font-size: 200% }` as a **test-only rem/root-font stress**.

That is **not** the same as Safari/Chrome **200% page zoom** (or browser text-only zoom). CSS root scaling, `deviceScaleFactor`, and `pageScaleFactor` are different mechanisms.

Manual acceptance still requires a real browser 200% zoom pass on representative public pages.

Default typography remains rem-based / token-driven.

## Candidate visual review (not approved)

The first public visual run produced candidate PNGs. They are **not** blessed.

```bash
cd platform
npm run review:visual
open e2e/visual-review/index.html
open e2e/public-visual.spec.ts-snapshots
npx playwright show-report
npm run test:ui
```

`npm run review:visual` rebuilds a local HTML contact sheet from existing snapshots. It does not modify PNG files and does not run `--update-snapshots`.

## QA stress page

`/qa/layout-stress` renders long/missing content fixtures. It is enabled only when `ALLOW_QA_STRESS=1` (set by the Playwright webServer). It is disallowed in `robots.ts` and is not in the sitemap. Seed church copy is unchanged. The path is `/qa` rather than `/__qa__` because Next.js treats underscore-prefixed folders as private (not routed).
