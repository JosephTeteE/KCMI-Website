# Data processing inventory (KCMI V2 staging / public platform)

**Date:** 2026-09-08  
**Scope:** Actual processing observed in this repository and the current V2 platform implementation.  
**Not:** a legal opinion, DPIA, or production privacy policy.

Labels: **IMPLEMENTED** = present in V2 platform code/schema; **LINKED EXTERNAL** = visitor is sent to a third party already used on the public site; **NOT IN THIS PHASE** = architecture exists or is planned, but this inventory does not claim it is live on the public V2 site.

No secrets, credentials, or pastoral narratives are recorded here.

## 1. Hosting and delivery

| System | What is processed | Category | Notes |
| --- | --- | --- | --- |
| Vercel (application host) | HTTP requests, responses, platform logs, deployment metadata | IMPLEMENTED | Public site and Hub UI. Do not assume log contents; application rules forbid pastoral/PII payloads in logs. |
| Custom staging host | Same application as configured for staging | IMPLEMENTED | Staging is configured **noindex / nofollow**. Canonical host is an environment setting (`NEXT_PUBLIC_SITE_URL`), not Hub-editable. |
| Next.js application | Page rendering, cookies used by Supabase Auth on Hub routes | IMPLEMENTED | Public pages are largely content reads. Hub uses authenticated cookies. |

## 2. Supabase (Auth, database, Storage)

| System | What is processed | Category | Notes |
| --- | --- | --- | --- |
| Supabase Auth | Hub staff emails, authentication sessions, TOTP MFA for Hub (AAL2) | IMPLEMENTED | Staff accounts only. No custom password storage. MFA required before Hub actions (ADR-0003). |
| PostgreSQL (public CMS) | Published/draft programs, sermons metadata, branch public facts, service times, livestream Facebook URL + manual `is_live`, website document payloads, media asset metadata, content revisions, audit events, RBAC | IMPLEMENTED | Anonymous Data API **SELECT** only on intended public tables. Draft/preview rows are not for public visitors. |
| PostgreSQL (Care / pastoral) | `pastoral_requests`, `pastoral_case_notes` (prayer / pastoral / welfare) | IMPLEMENTED (Hub foundation) | **HIGHLY_SENSITIVE**. RLS; no anon grants; no super_admin/media automatic access. Hub AAL2 for reads. **No public forms yet** — visitor intake remains Google Forms. No historical import. No attachments V1. Retention policy documented; deletion jobs deferred. See [CARE_P1_FOUNDATION.md](CARE_P1_FOUNDATION.md). |
| PostgreSQL (Giving admin) | Giving destinations + dual-approval proposals | IMPLEMENTED | Public `/giving` may show published DB destinations on staging after cutover; not donor narratives. |
| Storage bucket `marketing-public` | Public marketing images (JPEG/PNG ingested → WebP), alt text, dimensions | IMPLEMENTED | Server-only writes; Sharp normalization; metadata stripping; size/type allowlisting. Public read of marketing images after publish. |
| Private receipt storage / payment evidence | Event or giving receipts | NOT IN THIS PHASE | ADR-0004 describes the **target** model. V2 public site does not currently collect camp/event receipts. |

## 3. Hub staff accounts

| Item | Category | Notes |
| --- | --- | --- |
| Super Admin / HQ Content Admin (and other RBAC roles) | IMPLEMENTED | Roles and permissions in Postgres. HQ Content Admin = `media_admin` operating name. Super Admin does not receive automatic pastoral narrative access. |
| Audit events | IMPLEMENTED | Privileged Hub actions write `audit_events` (action, entity, actor id, non-secret metadata). |
| Content revisions | IMPLEMENTED | JSON snapshots of structured CMS fields — not binaries or secrets. |

## 4. Public visitor data collected **by this V2 site**

| Flow | Personal data collected by V2 | Category | Notes |
| --- | --- | --- | --- |
| Browsing public pages | Technical request data at the host (typical HTTP) | IMPLEMENTED | No first-party public contact form, newsletter signup, or registration form is implemented on V2 in this phase. |
| Contact page | None submitted to V2; `mailto:` / `tel:` | IMPLEMENTED | Canonical public email is `contact@kcmi-rcc.org`. Phone is the published HQ number. |
| Prayer / counselling / welfare / celebrations / cell / service-team | Submitted on **Google Forms**, not stored by V2 public site by default | LINKED EXTERNAL | Verified `forms.gle` URLs remain live CTAs. First-party Prayer submit exists at `/prayer` but is **gated off** (`KCMI_PRAYER_INTAKE_ENABLED`) until HUMAN cutover. See [CARE_P2_PRAYER.md](CARE_P2_PRAYER.md). |
| Giving page | None submitted to V2; displays bank details from seed | IMPLEMENTED (display only) | Destination **administration** is D2 / not started. |
| Sermons / livestream | None submitted to V2; outbound YouTube / Facebook | LINKED EXTERNAL | Sermon rows store YouTube **URLs** only (no embed HTML). Livestream stores a Facebook URL + staff-set live flag (ADR-0007). |
| Events / camp registration on V2 | Not collected | NOT IN THIS PHASE | Events V1 publishes Event **content** only (`/events`). Registration/payments deferred; legacy `camp-deploy` is separate. |

## 5. Public media and third-party platforms (outbound)

| Destination | Use | Category |
| --- | --- | --- |
| YouTube `@rehoboth-tv` | Sermons / media | LINKED EXTERNAL |
| Facebook page share URL currently in seed/Hub | Livestream follow / watch | LINKED EXTERNAL — canonical Page URL still in verification gaps |
| Instagram `kcmiworldwide` | Social | LINKED EXTERNAL |
| X/Twitter `kcmi_official` | Social | LINKED EXTERNAL |
| TikTok `@frank.aikins` | Sermon highlights; **personal/ministry account of Apostle Frank**, not labelled as a KCMI-branded TikTok unless later verified | LINKED EXTERNAL |
| Spotify Daily Faith Recharge show | Audio | LINKED EXTERNAL |
| Silverbird Television site | Named as a broadcast destination; **schedule claim withheld** until verified | LINKED EXTERNAL |
| Google Maps search links | Branch directions | LINKED EXTERNAL |

## 6. Bot protection and analytics

| Item | Category | Notes |
| --- | --- | --- |
| Cloudflare Turnstile | IMPLEMENTED in platform code for **public write** endpoints when those exist (ADR-0005) | No first-party public write form is live on the public site in this phase, so Turnstile is not described as currently collecting visitor tokens on Contact. |
| reCAPTCHA v2/v3 | NOT used by V2 public site | Legacy only. Must not be described as current. |
| First-party analytics product | NOT IN THIS PHASE | Do not claim Google Analytics or similar unless added later. |

## 7. Retention (implemented vs unknown)

| Record class | Implemented retention in V2 code | Inventory note |
| --- | --- | --- |
| Published CMS copy, sermons metadata, branch public fields | No automatic purge implemented | Do **not** publish a fake retention period. |
| Marketing images | Remain until staff archive/remove; branch unlink does not delete the library file | Factual. |
| Hub auth sessions | Supabase Auth session behaviour | Do not invent expiry copy beyond “staff sessions are authenticated and MFA-gated.” |
| Audit / revisions | Append-only; no purge job in repo | Factual. |
| Legacy camp Google Sheet / Drive / Cloudinary receipts | Not processed by V2 | Must not appear as current V2 practice. |
| Google Forms responses | Retention is Google’s and the ministry’s use of that form — **EXTERNAL VERIFICATION REQUIRED** | V2 does not import those responses. |
| Care Hub requests (when present) | Prayer 6 months / Pastoral & Welfare 12 months after closure (provisional); notes follow parent; audit 24 months | Policy documented in Care P1; **deletion jobs not implemented yet**. |

## 8. What this inventory is not

- Not a description of the **legacy** production site (`www.kcmi-rcc.org` static site, Render livestream admin, JWT console, Google Drive receipts, camp Cloudinary uploads).
- Not authorization to deploy to production.
- Not a statutory assessment (Nigeria NDPR, GDPR, or otherwise).
