# KCMI QA Strategy (QA1)

This document explains the permanent full-spectrum quality harness in plain language.

## What this system is

A **Playwright-based** measurement platform for the KCMI website and Hub.

It reports what **is** and **is not** covered. It never claims a fake “100% tested.”

Approved product baseline for this harness:

- Public D1.7
- Hub V2 D1.8
- Program edit parity D1.8.1 (create/edit one wizard; Review shows **complete** schedule)

## Directory layout

- `platform/e2e/qa/` — manifest, workflows, mutation policy, auditors, artifact security
- `platform/e2e/full-spectrum/` — Playwright specs (smoke, Program lifecycle, a11y, layout, …)
- `platform/.qa-full-spectrum/` — **shareable/sanitized** report (no auth/traces)
- `platform/.qa-local-sensitive/` + `platform/playwright-report/` — **local-sensitive** (may include authenticated traces)

## Speed tiers

| Tier | When | What |
|------|------|------|
| **FAST** | Everyday | `qa:smoke`, relevant unit tests, limited layout |
| **STANDARD** | Before commit | `qa:interaction`, `qa:layout`, `qa:a11y`, `qa:content`, `qa:links` |
| **FULL** | Before release | `qa:full` (browser matrix, workflows, visual, performance, coverage reconciliation) |

## Commands

```bash
npm run qa:auth              # headed MFA → platform/.auth/qa-hub-user.json
npm run qa:auth:cleanup
npm run qa:smoke
npm run qa:layout
npm run qa:interaction
npm run qa:cross-browser
npm run qa:a11y
npm run qa:typography
npm run qa:content
npm run qa:links
npm run qa:runtime
npm run qa:visual            # never updates snapshots
npm run qa:visual:update     # human-only snapshot bless
npm run qa:performance       # public Unlighthouse/Lighthouse supplementary
npm run qa:hosted            # preview public suites
npm run qa:full              # first-run style audit + shareable report
npm run qa:ui                # Playwright UI mode — watch examples
npm run qa:report            # open HTML report (local-sensitive if traces embedded)
npm run qa:trace -- path.zip # open a local trace; never auto-ZIP authenticated traces
```

## Authentication

1. Run `npm run qa:auth` against preview or local.
2. Browser opens with HQ Content Admin email prefilled.
3. **Human** enters password + MFA.
4. Dashboard landmark must appear.
5. storageState saved under `.auth/` (gitignored, chmod 600 when supported).

No passwords, MFA secrets, or tokens in env/argv/source.

## Host safety

If the target host is `kcmi-rcc.org` / `www.kcmi-rcc.org`:

- `DRAFT_WRITE`, `PUBLIC_WRITE`, `DESTRUCTIVE` **refuse to run**.

Hosted staging (`kcmi-preview.josephtete.com`):

- SAFE / NAVIGATION / LOCAL_STATE OK
- DRAFT_WRITE only against `STAGING QA — …` records
- PUBLIC_WRITE / DESTRUCTIVE not executed by the generic suite

## Program lifecycle (required)

Create → When → Where → Visitor link → **Review exact schedule** → Save draft → Reopen → Edit → Review → Save → Reopen.

**Date-range-only Review = FAIL.**

## Visual regression

Pixel diffs prove “matches approved baseline,” not “looks beautiful.”

- Chromium primary baselines
- `qa:visual` never updates
- `qa:visual:update` is explicit human action
- Phrase mismatches as “Visual change detected”

## What automation cannot prove

Beauty, spiritual tone, on-brand editorial judgment. **Human visual review remains required** for intentional redesigns.

## Artifact security

Shareable bundles are scanned for `.auth`, cookies, JWTs, service-role material, MFA URIs, private keys. Violations **fail packaging**.
