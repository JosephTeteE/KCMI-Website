# Phase 0 Inventory Report (Independent Verification Pass)

**Project:** Kingdom Covenant Ministries International (KCMI) / Rehoboth Christian Center  
**Repository:** local checkout `CHURCH_WEBSITE/` (npm package name: `church_website`)  
**Verification date:** 2026-09-07  
**Method:** Independent read-only inspection of source, Git metadata, and submodule; prior inventory was not trusted as authority.

### Evidence legend

| Status | Meaning |
|--------|---------|
| **VERIFIED** | Confirmed directly from repository source or Git commands in this pass |
| **INFERRED** | Reasonable conclusion from code structure; not proven by live infra inspection |
| **EXTERNAL-UNVERIFIED** | Depends on Google Forms, live DNS, Render/Vercel dashboards, or remote sheets not present in repo |
| **NOT FOUND** | Searched; no evidence in repository |

**Constraints honored:** No application refactor; no new frameworks; no installs/upgrades/deletes/commits/deploys; secret **values** never read into or printed in this report (`.env` contents not inspected). Environment-variable **names** only.

---

## 1. Repository topology

### 1.1 Git submodule

| Item | Value | Status | Evidence |
|------|-------|--------|----------|
| Path | `camp-deploy` | VERIFIED | `.gitmodules` lines 1–3; `git submodule status` |
| Remote URL | `https://github.com/JosephTeteE/kcmi-camp-temp.git` | VERIFIED | `.gitmodules`; `camp-deploy` `git remote -v` |
| Checked-out commit | `d0d3c16eb93cb1c4212e87e849d2ac9073d45934` | VERIFIED | `git submodule status`; `camp-deploy` `git rev-parse HEAD` |
| Commit subject | `Changed ref for HomePage link` | VERIFIED | `camp-deploy` `git log -1 --oneline` |
| Submodule tracked file count | 23 | VERIFIED | `cd camp-deploy && git ls-files \| wc -l` |

### 1.2 Root repository tracked surface

| Item | Value | Status | Evidence |
|------|-------|--------|----------|
| Branch | `main` tracking `origin/main` | VERIFIED | `git status -sb` |
| Tracked file count (root, incl. submodule gitlink) | 108 | VERIFIED | `git ls-files \| wc -l` |
| Untracked / dirty (this workspace) | `PHASE_0_INVENTORY.md` untracked; `README.md`, `public/js/loading.js` modified | VERIFIED | `git status -sb` |

### 1.3 Application / config inventory (source vs generated)

#### Source / config (VERIFIED present)

| Path | Role |
|------|------|
| `public/**/*.html` | Main static site pages |
| `public/js/*.{ts,js}` | Client scripts |
| `public/css/*` | Stylesheets |
| `public/assets/img/*` | Media |
| `public/favicon/*`, `public/site.webmanifest` | Icons / PWA manifest |
| `public/admin/` | Admin UI |
| `server/server.ts`, `server/db.ts` | Express backend |
| `api/livestream.ts` | Livestream router |
| `camp-deploy/` | Camp microsite submodule |
| `kcmi-rcc-worker/` | Cloudflare Worker |
| `package.json`, `package-lock.json` | Root Node project |
| `tsconfig.json` | Root TypeScript config (`outDir: dist`; excludes `camp-deploy`, `kcmi-rcc-worker`) |
| `vercel.json` | Main-site redirects only |
| `.gitmodules`, `.gitignore`, `.gitattributes` | Git config |
| `README.md`, `INTERNAL-DOCS.md` | Docs (INTERNAL-DOCS partially template/placeholder) |

#### Generated / local-only (not source of truth)

| Path | Classification | Status | Evidence |
|------|----------------|--------|----------|
| `dist/` | Build output | VERIFIED | `.gitignore` lists `dist`; `tsconfig` `outDir: ./dist`; directory present locally |
| `node_modules/` | Dependencies | VERIFIED | gitignored; present locally |
| `kcmi-rcc-worker/node_modules/`, `.wrangler/` | Worker deps / wrangler state | VERIFIED | `.gitignore` |
| `uploads/` | Multer dest | VERIFIED | `.gitignore`; empty/local |
| `.env` | Secrets file | VERIFIED exists locally & gitignored | `git check-ignore -v .env`; **values NOT inspected** |
| `server/certs/`, `ca.txt` | Cert artifacts | VERIFIED gitignored / not in `git ls-files` for certs | `.gitignore` lines 10–19 |
| `.vercel/`, `.next/`, `out/` | Deploy/framework caches | NOT FOUND as populated trees in this pass | Listed in `.gitignore` only |

#### NOT FOUND

| Item | Status |
|------|--------|
| `.env.example` | NOT FOUND |
| Root `Dockerfile` / `docker-compose` | NOT FOUND |
| `robots.txt` | NOT FOUND |
| `sitemap.xml` / sitemap generator | NOT FOUND |
| `camp-deploy/package-lock.json` | NOT FOUND |
| ESLint / Prettier config at repo root | NOT FOUND (worker has `.prettierrc` only) |
| SQL migration / schema dump files | NOT FOUND |

### 1.4 Naming note

README diagrams label the monorepo `church_website/`. In this checkout the main site is at repo-root `public/` (npm `name`: `church_website`). **VERIFIED** via `package.json` + directory listing.

---

## 2. Runtime & dependencies

### 2.1 Root `package.json`

| Item | Value | Status | Evidence |
|------|-------|--------|----------|
| Name / version | `church_website` `1.0.0` | VERIFIED | `package.json` |
| `engines` (Node/npm) | **NOT FOUND** | VERIFIED | no `engines` field |
| Scripts | `build`, `start`, `dev`, `test` | VERIFIED | `package.json` lines 6–10 |
| `test` script | Placeholder echo; exits 1 | VERIFIED | `"Error: no test specified"` |
| `lint` / `typecheck` scripts | **NOT FOUND** | VERIFIED | no such script keys |

**Scripts (verbatim roles):**

- `build`: `tsc && copyfiles -u 1 -e "**/*.ts" "public/**/*" dist/public`
- `start`: `node dist/server/server.js`
- `dev`: `ts-node-dev server/server.ts`
- `test`: stub only

**Resolved lock versions** (`package-lock.json` lockfileVersion 3) — VERIFIED:

| Package | Resolved version |
|---------|------------------|
| express | 4.21.2 |
| mysql2 | 3.14.1 |
| googleapis | 148.0.0 |
| google-auth-library | 9.15.1 |
| jsonwebtoken | 9.0.2 |
| nodemailer | 6.10.1 |
| multer | 2.0.2 |
| axios | 1.10.0 |
| cors | 2.8.5 |
| dotenv | 16.5.0 |
| express-rate-limit | 7.5.0 |
| node-cache | 5.1.2 |
| typescript (dev) | 5.8.3 |

### 2.2 `camp-deploy/package.json`

| Item | Value | Status |
|------|-------|--------|
| Scripts | `build`: `tsc` only | VERIFIED |
| Runtime deps | none | VERIFIED |
| DevDeps | `typescript ^5.4.5` | VERIFIED |
| Lockfile | NOT FOUND | VERIFIED |
| `engines` | NOT FOUND | VERIFIED |
| `outDir` in tsconfig | **NOT SET** — compiles beside sources unless configured at deploy | VERIFIED `camp-deploy/tsconfig.json` |

### 2.3 `kcmi-rcc-worker/package.json`

| Item | Value | Status |
|------|-------|--------|
| Scripts | `deploy`, `dev`, `start`, `test` (vitest) | VERIFIED |
| DevDeps | wrangler ^4, vitest ~3.0.7, @cloudflare/vitest-pool-workers | VERIFIED |
| `engines` | NOT FOUND | VERIFIED |
| Test file | `kcmi-rcc-worker/test/index.spec.js` | VERIFIED present |

### 2.4 Safe command execution (this pass)

| Command | Result | Notes |
|---------|--------|-------|
| `npx tsc --noEmit` (root; existing `node_modules`) | **exit 0** | VERIFIED — no install performed |
| `npm test` (root) | **NOT EXECUTED** | Would fail by design (stub) |
| `camp-deploy` / worker `npm test` / `wrangler` | **NOT EXECUTED** | Avoid changing state / deploying; worker tests need pool config |
| Live HTTP to Render/Vercel | **NOT EXECUTED** | Out of scope for source inventory |

Local toolchain observed (info only): Node `v22.13.1`, npm `11.5.2` — **not** declared as project requirement.

---

## 3. Deployment & infrastructure

### 3.1 Repository-confirmed

| Fact | Status | Evidence |
|------|--------|----------|
| Main Vercel redirects: `/youth-camp.html` and `/camp/youth-camp.html` → `https://camp.kcmi-rcc.org` (permanent) | VERIFIED | `vercel.json` |
| Backend URL hardcoded in clients: `https://kcmi-backend.onrender.com` | VERIFIED | `public/js/scripts.ts`, `promos.ts`, `church-calendar.js`, `admin/js/admin.js`, `camp-deploy/.../youth-camp-scripts.ts` |
| Domains referenced in CORS | `https://www.kcmi-rcc.org`, `https://kcmi-rcc.org`, `https://camp.kcmi-rcc.org` | VERIFIED | `server/server.ts` lines 107–108 |
| Cloudflare Worker long-cache for `/assets/`, `/css/`, `/js/`, `*.css`, `*.js` (1 year) | VERIFIED (code intent) | `kcmi-rcc-worker/src/index.js` lines 39–66 |
| Worker observability enabled | VERIFIED (config) | `kcmi-rcc-worker/wrangler.jsonc` |
| README claims: main + camp on Vercel; API on Render | INFERRED from README + code URLs | Live dashboards **EXTERNAL-UNVERIFIED** |

### 3.2 Cannot verify from repository alone

| Item | Status |
|------|--------|
| Actual Vercel project IDs, production deploy hooks, env on Vercel | EXTERNAL-UNVERIFIED |
| Render service plan, cron for `/api/db-keepalive`, custom domains binding | EXTERNAL-UNVERIFIED |
| Whether Cloudflare Worker is attached in front of kcmi-rcc.org | EXTERNAL-UNVERIFIED (code exists; DNS/route not in repo) |
| DNS records (A/CNAME/MX) | NOT FOUND in repo |
| Camp Vercel root directory / build command in production | EXTERNAL-UNVERIFIED (path debt in HTML suggests historical `public/camp/` layout) |

---

## 4. Environment variables

**Policy:** Names and purpose only. Values never documented. `.env` not opened.

### 4.1 Server-required (startup fail if missing)

Source: `server/server.ts` lines 91–101 (`requiredEnvVars` + early `GOOGLE_CREDENTIALS_BASE64` check lines 29–30).

| VARIABLE NAME | USED BY | PURPOSE | CLIENT/SERVER | REQUIRED/OPTIONAL | Notes |
|---------------|---------|---------|---------------|-------------------|-------|
| `GOOGLE_CREDENTIALS_BASE64` | `server/server.ts` | Google service account JSON (base64) for Calendar/Drive/Sheets | SERVER | REQUIRED | Startup throw if unset |
| `SMTP_HOST` | `server/server.ts` | SMTP host | SERVER | REQUIRED | |
| `SMTP_PORT` | `server/server.ts` | SMTP port | SERVER | REQUIRED | |
| `SMTP_USER` | `server/server.ts` | SMTP auth user / From | SERVER | REQUIRED | |
| `SMTP_PASS` | `server/server.ts` | SMTP password | SERVER | REQUIRED | |
| `CALENDAR_ID` | `server/server.ts` | Google Calendar ID for events | SERVER | REQUIRED | |
| `JWT_SECRET` | `server/server.ts` | Sign admin JWTs | SERVER | REQUIRED | |
| `GOOGLE_API_KEY` | `server/server.ts` | Returned via `/api/maps-proxy` to browser | SERVER→CLIENT | REQUIRED | Exposed to clients by design of proxy |
| `RECAPTCHA_SECRET_KEY_YOUTH` | `server/server.ts` | Verify camp reCAPTCHA | SERVER | REQUIRED | |
| `RECAPTCHA_SECRET_KEY_CONTACT` | `server/server.ts` | Verify contact + subscribe | SERVER | REQUIRED | |
| `GOOGLE_DRIVE_RECEIPTS_FOLDER_ID` | listed in `requiredEnvVars` only | Intended Drive folder for receipts (legacy?) | SERVER | REQUIRED at boot | **No other code reference** — dead requirement |
| `GOOGLE_SHEET_REGISTRATIONS_ID` | `server/server.ts` camp handler | Camp registration spreadsheet | SERVER | REQUIRED | |
| `KCMI_ADMIN_EMAIL` | listed in `requiredEnvVars` only | Unknown (docs imply admin) | SERVER | REQUIRED at boot | **No other code reference** — dead requirement |
| `AD_USER` | `server/server.ts` `/api/auth` | Admin username compare | SERVER | REQUIRED | |
| `AD_PASS` | `server/server.ts` `/api/auth` | Admin password compare | SERVER | REQUIRED | |

### 4.2 Database (used; not in `requiredEnvVars` array)

Source: `server/db.ts` lines 7–15.

| VARIABLE NAME | USED BY | PURPOSE | CLIENT/SERVER | REQUIRED/OPTIONAL |
|---------------|---------|---------|---------------|-------------------|
| `DB_HOST` | `server/db.ts` | MySQL host | SERVER | Effectively required for DB features; **not** in startup `requiredEnvVars` |
| `DB_USER` | `server/db.ts` | MySQL user | SERVER | same |
| `DB_PASS` | `server/db.ts` | MySQL password | SERVER | same |
| `DB_NAME` | `server/db.ts` | Database name | SERVER | same |
| `DB_PORT` | `server/db.ts` | MySQL port | SERVER | same |
| `DB_SSL_CERT_BASE64` | `server/db.ts` | Optional CA for TLS | SERVER | OPTIONAL |

### 4.3 Optional / conditional

| VARIABLE NAME | USED BY | PURPOSE | CLIENT/SERVER | REQUIRED/OPTIONAL |
|---------------|---------|---------|---------------|-------------------|
| `ENABLE_PING_ROUTE` | `server/server.ts` | If `"true"`, registers `GET /ping` | SERVER | OPTIONAL |
| `NODE_ENV` | `server/server.ts` | Suppresses ping log in production | SERVER | OPTIONAL |
| `PORT` | `server/server.ts` | Listen port (default 5000) | SERVER | OPTIONAL |

### 4.4 Documented but unused in TypeScript

| VARIABLE NAME | Mentioned in | Code usage | Status |
|---------------|--------------|------------|--------|
| `CLOUDINARY_URL` | `README.md`, `INTERNAL-DOCS.md` | **NOT FOUND** in `server/` or `api/` | Client uses unsigned upload preset instead |

### 4.5 Hardcoded client-side identifiers (not env; tracked source)

Flagged as **hardcoded in tracked source** (public-by-design or sensitive-by-exposure). **Values not reproduced beyond what is already public site-key / public ID pattern discussion — report names the artifact type and file, not secret material:**

| Artifact type | File(s) | Risk note | Status |
|---------------|---------|-----------|--------|
| reCAPTCHA **v3 site key** | Multiple `public/*.html`, `public/js/scripts.ts` | Site keys are public; still environment-coupled | VERIFIED |
| reCAPTCHA **v2 site key** | `camp-deploy/public/js/youth-camp-scripts.ts` | Public site key | VERIFIED |
| Cloudinary **cloud name** + **unsigned upload preset** name | `youth-camp-scripts.ts` (`CLOUD_NAME`, `UPLOAD_PRESET`) | Enables client uploads to that preset; abuse risk if preset permissive | VERIFIED |
| Promo Google **Sheet spreadsheet ID** | `public/js/promos.ts` `PROMO_SHEET_ID` | Public ID; access controlled by sharing + service account | VERIFIED |
| Backend absolute Render URL | Multiple client files | Environment coupling; no staging switch | VERIFIED |

No SMTP passwords, JWT secrets, DB passwords, or service-account private keys were found **as plaintext assignments in tracked application source** in this pass (credentials expected only via env). **`.env` not opened.**

---

## 5. Current data stores

### 5.1 MySQL

| Finding | Status | Evidence |
|---------|--------|----------|
| Pool via `mysql2` | VERIFIED | `server/db.ts` |
| Table `livestream` columns used: `id`, `embed_code`, `isLive` | VERIFIED | `api/livestream.ts` `REPLACE INTO livestream (...)`; `SELECT embed_code, isLive FROM livestream WHERE id = 1` |
| Full schema / migrations / indexes / charset | NOT FOUND | No SQL files |
| Table `users` | NOT FOUND in executable code | `INTERNAL-DOCS.md` claims `users` — **documentation drift** vs env-based `AD_USER`/`AD_PASS` |
| Doc name `livestreams` (plural) | Conflicts with code table `livestream` | INFERRED docs outdated (`INTERNAL-DOCS.md`) |
| Other tables | UNKNOWN | No evidence |

### 5.2 Google Sheets

| Use | ID source | Layout | Status |
|-----|-----------|--------|--------|
| Promos / events | Client `PROMO_SHEET_ID` → `GET /api/sheets-events?id=` | Header-driven columns (normalized): EventTitle, EventType, MediaLink, Description, StartDate, EndDate, AllDay, MorningTime, AfternoonTime, EveningTime, Location, ContactDetails, ContactInstructions, Notes, ButtonText, ButtonLink; range `A1:P100` | VERIFIED `server/server.ts` 394–419; `promos.ts` |
| Camp registrations | Env `GOOGLE_SHEET_REGISTRATIONS_ID` | Append to `Sheet1!A1` row: `[timestamp Lagos, fullName, email, phoneNumber, numPeople, paymentReceiptUrl, submissionId]` — **header row not defined in code** | VERIFIED `server/server.ts` 520–537 |
| Live sheet contents / sharing ACLs | EXTERNAL-UNVERIFIED | |

### 5.3 Google Calendar

| Item | Status | Evidence |
|------|--------|----------|
| `events.list` on `CALENDAR_ID`, next ~1 month, max 20 | VERIFIED | `server/server.ts` 332–339 |
| Cache TTL 1800s | VERIFIED | NodeCache config |
| Actual calendar contents | EXTERNAL-UNVERIFIED | |

### 5.4 Google Drive

| Item | Status | Evidence |
|------|--------|----------|
| Scope `drive` on service account | VERIFIED | `server/server.ts` scopes |
| `GET /api/drive-manifest?id=` fetches file JSON media | VERIFIED | lines 353–373 |
| **In-repo callers of `/api/drive-manifest`** | NOT FOUND | Only defined on server |
| `GOOGLE_DRIVE_RECEIPTS_FOLDER_ID` usage for uploads | NOT FOUND in handlers | Required env but unused |
| Promo media may reference Drive file IDs via MediaLink parsing | VERIFIED | `extractMediaInfo` |

### 5.5 Cloudinary

| Item | Status | Evidence |
|------|--------|----------|
| Browser unsigned image upload then URL to backend | VERIFIED | `camp-deploy/public/js/youth-camp-scripts.ts` |
| Server-side Cloudinary SDK | NOT FOUND | |
| Retention / folder policies | EXTERNAL-UNVERIFIED | |

### 5.6 Email / other

| Store | Status | Evidence |
|-------|--------|----------|
| Contact messages → email `kcmi.forms@gmail.com` (not DB) | VERIFIED | `server/server.ts` 222–226 |
| WhatsApp subscribe → email to user with wa.me link | VERIFIED | lines 253–260 |
| Camp confirmations → SMTP to registrant | VERIFIED | lines 554–559 |
| localStorage promo cache / admin JWT | VERIFIED | `promos.ts`; `admin/index.html` |

---

## 6. Authentication & authorization

### 6.1 Admin login flow (as coded)

```
admin/index.html loginForm
  → POST https://kcmi-backend.onrender.com/api/auth { username, password }
  → Compare to process.env.AD_USER / AD_PASS
  → jwt.sign({ username }, JWT_SECRET, { expiresIn: "1m" })
  → localStorage.setItem("token", token)
  → Show #adminContent (UI only)
```

| Step | Status | Evidence |
|------|--------|----------|
| Credential compare to env | VERIFIED | `server/server.ts` 309–316 |
| JWT TTL **1 minute** | VERIFIED | `expiresIn: "1m"` |
| Token stored in `localStorage` | VERIFIED | `admin/index.html` 135 |
| Client attempts `jwt_decode(token)` | VERIFIED | `admin/index.html` 156 |
| `jwt-decode` library script tag | **NOT FOUND** on admin page | Broken expiry check likely throws → catch clears token path |
| DB `users` table | NOT FOUND | |

### 6.2 Authorization gap (material)

| Finding | Status | Evidence |
|---------|--------|----------|
| `POST /api/livestream` has **no** JWT verification middleware | VERIFIED | `api/livestream.ts` entire file |
| `admin.js` save does **not** send `Authorization` header | VERIFIED | `public/admin/js/admin.js` 51–55 |
| Token only gates **showing** the admin UI in the browser | VERIFIED | `admin/index.html` + `admin.js` |
| Therefore livestream embed updates are **effectively public** to anyone who can POST to the API (subject to CORS browser rules; non-browser clients unconstrained by CORS) | VERIFIED / INFERRED | Code + CORS semantics |

### 6.3 Endpoint protection summary

| Endpoint | AuthN | Status |
|----------|-------|--------|
| `POST /api/auth` | Public (issues token) | VERIFIED |
| `GET/POST /api/livestream` | **Unauthenticated** | VERIFIED |
| Contact / subscribe / camp | reCAPTCHA secrets server-side; no user login | VERIFIED |
| Calendar / sheets / maps / drive-manifest / db-* | Public | VERIFIED |

---

## 7. API surface

Base (clients): `https://kcmi-backend.onrender.com` — VERIFIED hardcoded.

| Method | Path | Caller(s) | Validation | Auth | Rate limit | External deps | Status |
|--------|------|-----------|------------|------|------------|---------------|--------|
| POST | `/submit-contact` | `public/js/scripts.ts` | email regex; optional phone regex; reCAPTCHA contact | Public + reCAPTCHA | None | SMTP; reCAPTCHA Google | VERIFIED |
| POST | `/subscribe` | `scripts.ts` WhatsApp form | email; `subscriptionType==="whatsapp"`; reCAPTCHA | Public + reCAPTCHA | None | SMTP; reCAPTCHA | VERIFIED |
| GET | `/api/db-check` | **No in-repo caller** | ping pool | Public | None | MySQL | VERIFIED |
| GET | `/ping` | **No in-repo caller** | none | Public; only if `ENABLE_PING_ROUTE=true` | None | — | VERIFIED |
| GET | `/api/db-keepalive` | **No in-repo caller** (likely external cron — UNKNOWN) | `SELECT 1` | Public | None | MySQL | VERIFIED |
| GET | `/api/livestream` | `scripts.ts`, `admin.js` | — | Public | None | MySQL | VERIFIED |
| POST | `/api/livestream` | `admin.js` | `embedCode` required | **None** | None | MySQL | VERIFIED |
| POST | `/api/auth` | `admin/index.html` | username/password body | Issues JWT | None | JWT | VERIFIED |
| GET | `/api/calendar-events` | `church-calendar.js` | — | Public | 100 / 15 min | Google Calendar | VERIFIED |
| GET | `/api/drive-manifest` | **No in-repo caller** | `id` query required | Public | None | Google Drive | VERIFIED |
| GET | `/api/sheets-events` | `promos.ts` | `id` query required | Public | None | Google Sheets | VERIFIED |
| GET | `/api/maps-proxy` | `scripts.ts` | — | Public | 100 / 15 min | returns Maps API key | VERIFIED |
| POST | `/api/camp-registration` | `youth-camp-scripts.ts` | fields + numPeople + reCAPTCHA youth | Public + reCAPTCHA | None | Sheets; SMTP; (Cloudinary client-side) | VERIFIED |

**Multer:** configured (`uploads/`, 5MB, jpeg/png/gif/pdf) in `server/server.ts` 157–168 but **not attached** to any route in current code — VERIFIED unused middleware.

**Static:** `express.static` serves `../public` when Express hosts files — VERIFIED line 126. Production split (Vercel static vs Render API) is EXTERNAL-UNVERIFIED.

---

## 8. Security controls

| Control | Finding | Status |
|---------|---------|--------|
| CORS | Allowlist three production origins; methods GET/POST/PUT/DELETE | VERIFIED `server.ts` 107–113 |
| CSP | Set on Express responses; allows `'unsafe-inline'`; Maps/Google/Drive/YouTube frames | VERIFIED 572–582; **does not** list Bootstrap/cdnjs/unpkg used by static HTML if those pages are not CSP-covered by Express |
| reCAPTCHA | v3 contact/subscribe; v2 invisible camp | VERIFIED |
| Rate limit | Calendar + maps only | VERIFIED; **camp/contact/subscribe/livestream unauthenticated writes uncapped** |
| Input validation | Email/phone/camp fields server-side; contact `message` not length-limited in code | VERIFIED |
| File upload | Client-side type/size; Cloudinary unsigned; multer unused | VERIFIED |
| Logging | `console.error` / request logs on livestream router | VERIFIED; no structured APM in repo |
| Error handling | Global Express error middleware; may return `err.message` to client | VERIFIED 586–594 |
| TLS SMTP | `rejectUnauthorized: false`; `ciphers: "SSLv3"` | VERIFIED 142–145 — weak / concerning config |
| Admin JWT unused for API auth | See §6 | VERIFIED |
| XSS risk | Livestream `embedCode` inserted via `innerHTML` | VERIFIED `scripts.ts` 151–152 |

**Obvious risks (inventory only; no fixes):** unauthenticated livestream POST; Maps API key to browser; unsigned Cloudinary preset; JWT UI-only; weak SMTP TLS settings; public db-check/keepalive; dead required secrets increase secret sprawl.

---

## 9. Forms & personal data

### 9.1 In-repo schemas (VERIFIED)

| Form | Fields | Data class | Backend |
|------|--------|------------|---------|
| Contact `#contactForm` | email, phone, message, recaptchaToken | Contact / possibly pastoral free-text | Email to `kcmi.forms@gmail.com` + auto-reply |
| WhatsApp DFR `#whatsappSubscriptionForm` | email | Contact | Email with wa.me subscribe link |
| Camp `#campRegistrationForm` | fullName, email, phoneNumber, numPeople, paymentReceipt (file→URL), recaptchaToken | Contact + **financial proof** (receipt image/PDF) | Cloudinary URL + Sheet + email |
| Admin login | username, password | Credentials | Compared to env; JWT |
| Navbar search | text | Non-sensitive UI | Client-only |

Camp receipt uploads are **payment evidence** (sensitive financial). Contact/camp free text may include pastoral content incidentally — classification: contact + financial (camp); pastoral **possible** in message body (UNSTRUCTURED).

### 9.2 Google Forms (EXTERNAL-UNVERIFIED field schemas)

| Label | URL | Sensitivity (from label only) | Field schema |
|-------|-----|-------------------------------|--------------|
| Counselling | `forms.gle/L6DyfegmTCGHuSBk6` | Pastoral / counselling | EXTERNAL-UNVERIFIED |
| Welfare | `forms.gle/NcScEq6WFDeBankw5` | Welfare / possibly financial need | EXTERNAL-UNVERIFIED |
| Celebrations | `forms.gle/QxiASWogkGFamvEJ8` | Personal life events | EXTERNAL-UNVERIFIED |
| Prayer | `forms.gle/gKTwNc9gNiVCWWrJ6` | Prayer / pastoral | EXTERNAL-UNVERIFIED |
| First-Timers | `forms.gle/pzcwLAbUbXXjWxVU6` | Contact / newcomer | EXTERNAL-UNVERIFIED |
| Cell Fellowships | `forms.gle/ogHw37wRpx9HC2bs5` | Contact / community | EXTERNAL-UNVERIFIED |
| Service Teams | `forms.gle/Xo3rbm2rFaidrqCbA` | Volunteer contact | EXTERNAL-UNVERIFIED |

Linked from main nav Connect dropdown (most pages) and camp nav — VERIFIED by grep across `public/*.html` and `camp-deploy/public/index.html`.

---

## 10. Assets & content

### 10.1 Main pages (VERIFIED paths)

| Path | Title / role |
|------|----------------|
| `public/index.html` | Home — hero reel, promos, prayer CTA |
| `public/location.html` | Branches + maps/phones |
| `public/services.html` | Fellowships, teams, worship times |
| `public/contact-us.html` | Contact form |
| `public/giving-kcmi.html` | Giving accounts |
| `public/livestream.html` | Live embed host |
| `public/sermons.html` | Sermons + Silverbird video |
| `public/mission-kcmi.html` | Vision/mission |
| `public/about-apostle-aikins.html` | Lead pastor |
| `public/faqs.html` | FAQs |
| `public/privacy-policy.html` | Privacy |
| `public/terms-of-service.html` | Terms |
| `public/admin/index.html` | Livestream admin |
| `camp-deploy/public/index.html` | Camp registration |

### 10.2 Banking / contact / service info that must survive migration

| Item | Value in source | Status |
|------|-----------------|--------|
| General giving | Ecobank **1602002211**, KINGDOM COVENANT MINISTRIES INTERNATIONAL | VERIFIED `giving-kcmi.html` |
| Care group giving | Union Bank **0055484937**, same org name | VERIFIED `giving-kcmi.html` |
| Camp fee account | Access Bank **0097279229**, Eke Orji Eke; ₦30,000/person | VERIFIED camp `index.html` |
| Camp donation | Union Bank **0055484937**, KCMI INT'L | VERIFIED camp |
| DFR WhatsApp | +234 9134 44 8322 | VERIFIED multiple pages + server wa.me |
| Contact inbox | kcmi.forms@gmail.com | VERIFIED server |
| HQ worship | Sunday 08:30; Thursday 17:30 (location/services) | VERIFIED |
| Map coords | lat 4.831148938457418, lng 7.01167364093468 | VERIFIED `/api/maps-proxy` |
| Camp event window in copy | Aug 12–16, 2025 “Level Up” | VERIFIED camp HTML — **may be stale relative to “today”** |

Branch phones/addresses: Port Harcourt HQ, Rumuigbo, Abia, Lomé, Accra, UCC campus — VERIFIED `location.html` (content must be preserved or explicitly retired).

### 10.3 Large media & orphans

`public/assets/` ≈ 64MB — VERIFIED `du`.

| File | Size | In-repo HTML/CSS/JS ref? | Status |
|------|------|--------------------------|--------|
| `KCMI-background-reel.webm` | 15M | Yes `index.html` | VERIFIED used |
| `KCMI-background-reel.mp4` | 11M | Yes | VERIFIED used |
| `rehoboth-wells-silverbird-video.webm/.mp4` | 4.7M / 3.9M | Yes `sermons.html` | VERIFIED used |
| `welcome-to-kcmi-fallback-image.png/.webp` | 4.5M / 229K | Yes hero picture | VERIFIED used |
| `welcome-to-kcmi-video.{mp4,webm,mov}` | 3.5–4.0M | **0 refs** | VERIFIED suspected orphan |
| `giving-kcmi.{webm,MP4}` | 353–399K | **0 refs** | VERIFIED suspected orphan |
| `kcmi-giving-fallback-image.png` | 962K | **0 refs** | VERIFIED suspected orphan |
| `rehoboth-wells-silverbird-video.mov` | 3.9M | **0 refs** | VERIFIED suspected orphan |
| `praying-hands.jpeg`, `prayer-request.jpg` | small | **0 refs** (`prayer-request.jpeg` is used in CSS) | VERIFIED |
| `Cross-sectional-...-HQ.JPEG` | 58K | **0 refs** | VERIFIED suspected orphan |
| `Cross-sectional-...-Abia-State-2.JPEG` | 193K | Yes `location.html` | VERIFIED used |
| `apostle1..5.JPG` | ~197–310K | Yes `styles.css` (`.JPG`); HTML about page uses `.jpg` lowercase — **case risk on Linux hosts** | VERIFIED |

Camp assets: icons only (~76K); **no camp flyer image in submodule** — VERIFIED.

### 10.4 Camp path debt

With `<base href="./">` on `camp-deploy/public/index.html`:

| Reference | Issue | Status |
|-----------|-------|--------|
| `../css/styles.css`, `../favicon/`, footer `../assets/img/` | Resolve outside `public/` | VERIFIED inconsistent with `./assets` logo path |
| HTML comment `public/camp/youth-camp.html` | Legacy layout | VERIFIED |
| Expects compiled `./js/*.js` | Sources are `.ts`; deploy must run `tsc` | VERIFIED |

### 10.5 Branding / SEO fragments

- Manifest: `public/site.webmanifest` — VERIFIED  
- Many pages: `meta robots index,follow`, canonical `kcmi-rcc.org` — VERIFIED  
- `robots.txt` / `sitemap` — NOT FOUND  

---

## 11. Quality & operations

| Area | Finding | Status |
|------|---------|--------|
| Root automated tests | Stub only | VERIFIED |
| Worker tests | `kcmi-rcc-worker/test/index.spec.js` + vitest config | VERIFIED present; **NOT EXECUTED** this pass |
| Typecheck | `tsc --noEmit` exit 0 with existing deps | VERIFIED |
| Lint | NOT FOUND root | |
| Health | `/ping` optional; `/api/db-check`; `/api/db-keepalive` | VERIFIED code; live scheduling EXTERNAL-UNVERIFIED |
| Monitoring | Worker observability flag only | VERIFIED config; no Datadog/Sentry/etc. NOT FOUND |
| Backup/recovery | NOT FOUND in repo | INTERNAL-DOCS has placeholders |
| Accessibility | No a11y test suite NOT FOUND; some `aria-*` in HTML INFERRED partial |
| Redirects | Youth camp → subdomain | VERIFIED `vercel.json` |
| `.env.example` | NOT FOUND | Onboarding gap |
| Docs accuracy | INTERNAL-DOCS claims `users` / `livestreams` / Drive receipts / CLOUDINARY_URL — conflicts with code | VERIFIED drift |

---

## 12. Corrections vs prior Phase 0 draft

Independent pass found and now records:

1. Additional tracked media (`.mov`, `giving-kcmi.MP4`, apostle JPGs, Abia/HQ cross-section JPEGs) missed or under-specified earlier.  
2. Admin JWT does **not** protect livestream API — prior summary understated this.  
3. `GOOGLE_DRIVE_RECEIPTS_FOLDER_ID` and `KCMI_ADMIN_EMAIL` required at boot but unused.  
4. Multer configured but unused; camp uses Cloudinary client upload.  
5. `/api/drive-manifest`, `/api/db-check`, `/api/db-keepalive` have **no in-repo callers**.  
6. `jwt-decode` referenced without script include.  
7. No root `engines`; no `.env.example`; no robots/sitemap.  
8. Submodule SHA pinned: `d0d3c16eb93cb1c4212e87e849d2ac9073d45934`.  
9. INTERNAL-DOCS schema names disagree with SQL in `api/livestream.ts`.

---

## PHASE 0 CERTIFICATION GAPS

Items that still prevent truthfully saying: *“We understand the current KCMI platform well enough to design its replacement without guessing.”*

1. **Google Forms field schemas & data residency** — Counselling, Welfare, Prayer, Celebrations, First-Timers, Fellowships, Service Teams remain EXTERNAL-UNVERIFIED. Cannot design equivalent data models, retention, or pastoral confidentiality controls without exporting/inspecting those Forms (or receiving authoritative copies).

2. **MySQL ground truth** — Only `livestream` usage is code-verified. No migrations, no confirmation that doc-claimed `users` never existed in production, no backup topology, no Aiven networking/IP allowlist evidence in repo.

3. **Camp registration Sheet** — Append column order is known; **header names, historical rows, sharing ACLs, and whether Drive receipts folder was ever used** are UNKNOWN.

4. **Promo Sheet live content & editors** — Column contract known; who edits it and current rows EXTERNAL-UNVERIFIED.

5. **Production deploy wiring** — Exact Vercel root/build for main vs camp, whether Cloudflare Worker sits on apex/www, Render env completeness vs `requiredEnvVars`, and keepalive cron — EXTERNAL-UNVERIFIED.

6. **Auth security reality vs intent** — Code shows livestream POST is unauthenticated; whether production has an extra gateway/WAF is UNKNOWN. Replacement design cannot assume “JWT-protected admin” without fixing or confirming live controls.

7. **Cloudinary** — Unsigned preset policies, stored receipt inventory, and account ownership EXTERNAL-UNVERIFIED (only client cloud name + preset name visible in source).

8. **SMTP / inbox operations** — Provider, deliverability, who reads `kcmi.forms@gmail.com`, and retention UNKNOWN beyond code recipients.

9. **Camp season currency** — UI still describes 2025 Aug camp; whether subdomain should remain live, archive, or retarget is a product decision not answered by code alone.

10. **Operational runbooks** — INTERNAL-DOCS is partially placeholder (`{{MIGRATION_DEADLINE}}`, etc.); emergency access, credential vault locations, and backup restore drills are NOT FOUND as executable truth.

11. **Secret inventory completeness** — Without a controlled review of Render/Vercel/Cloudflare dashboards (not performed; `.env` not read), we cannot certify that runtime env matches code’s required set or that unused required vars are still populated.

12. **Content freeze list for non-code assets** — Orphan media vs intentionally unpublished archives needs stakeholder confirmation before deletion in a later phase.

**Certification stance:** Phase 0 source inventory is **substantially verified for in-repo architecture**. It is **not yet sufficient** to certify replacement design without guessing on Forms schemas, database/sheet production state, edge/DNS deployment topology, and operational ownership of secrets and pastoral data.

---

*End of independently verified Phase 0 Inventory Report. No target architecture proposed.*
