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
npm run qa:cloud:cross-browser  # Codespaces Linux matrix → hosted preview (no Hub auth)
npm run qa:cloud             # Codespaces cloud-safe tier + cross-browser
npm run qa:cloud:report      # HTML report on 0.0.0.0:9323 (Codespaces port forward)
npm run qa:cloud:ui          # optional Playwright UI Mode on :8080
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

## Cloud QA with GitHub Codespaces

The 2017 Mac / local Docker daemon is **not** the platform for the full Playwright browser matrix. Use **GitHub Codespaces** as the remote Linux QA lab.

| Where | Role |
|-------|------|
| **Local Mac** | Day-to-day development + authenticated Hub (headed MFA / storageState) |
| **Codespaces** | Linux Chromium / Firefox / WebKit / mobile emulation — public + deterministic SAFE coverage |

**No nested Docker.** The Codespace uses the official Playwright Linux image with browsers installed in the environment.

### Human steps

1. Open the GitHub repository → **Code** → **Codespaces**.
2. Create a Codespace on branch **`rebuild/kcmi-v2`** (not `main`).
3. Wait for setup (`postCreateCommand` runs `npm ci` in `platform/`).
4. In the terminal: `cd platform` if you are not already there.
5. Cross-browser only: `npm run qa:cloud:cross-browser`
6. Full cloud-safe tier: `npm run qa:cloud`
7. Open the HTML report: `npm run qa:cloud:report` → Codespaces forwards port **9323** → open the notified URL.
8. **Stop / delete the Codespace** when finished to conserve included quota.

Optional UI Mode (forwarded web UI, not a remote desktop):

```bash
npm run qa:cloud:ui
```

Then open the forwarded port **8080**.

### What Codespaces does **not** do

- Does **not** copy `platform/.auth/`, cookies, MFA, or storageState from the Mac.
- Does **not** run real HQ Content Admin login.
- Does **not** execute `PUBLIC_WRITE` / `DESTRUCTIVE` Hub mutations.
- Does **not** bless visual baselines (`qa:visual:update` remains human + local).

Authenticated Hub Chromium acceptance remains a **local / hosted MFA** workflow. Codespaces owns cross-browser public compatibility.

### Image / versions

- Dev container image: `mcr.microsoft.com/playwright:v1.63.0-noble` (must match locked `@playwright/test`)
- Node: **22** (aligned with CI; provided by the Playwright image)
- Env: `KCMI_QA_ENV=codespaces`, `E2E_BASE_URL=https://kcmi-preview.josephtete.com`, `E2E_SKIP_WEBSERVER=1`

Config file: `platform/playwright.codespaces.config.ts` (bundled browsers, no Chrome channel, no storageState).
