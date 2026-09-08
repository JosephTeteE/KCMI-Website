# Content Verification Gaps

Phase C2 / C2.1 public site, updated in **Phase D1.3** (public content hygiene).  
Unresolved factual conflicts from legacy sources. **Do not invent resolutions** — each item needs human confirmation before treating the public site as fact-complete for production cutover.

Related code seeds (not secrets):

- `platform/src/content/seed/branches.ts`
- `platform/src/content/seed/engagement.ts` (public contact)
- `platform/src/content/seed/giving.ts`
- `platform/src/content/seed/pages.ts` (livestream)
- `platform/src/content/seed/legal-privacy.ts`
- `platform/src/content/seed/legal-terms.ts`

---

## 1. Togo phone conflict

| Field | Value |
| --- | --- |
| **Conflicting values** | Display / `tel` used in V2: `+228 94 43 38 85` (`tel:+2289443385`). Legacy `data-phone` attribute: `+22897817263`. |
| **Sources** | Legacy `public/location.html` (Togo branch card attributes vs visible phone text). Seed note in `branches.ts` (`id: "togo"`). |
| **Impact** | Visitors may dial the wrong number; WhatsApp / click-to-call may not reach the intended contact. |
| **Human confirmation needed** | Which number is current for the Togo branch? Update display, `tel`, and any WhatsApp hints consistently. |

---

## 2. Accra phone / display conflict

| Field | Value |
| --- | --- |
| **Conflicting values** | Legacy visible string used atypical spacing (approximately `+23 3543…`). Dialable value used in V2: `+233 543 340 415` (`tel:+233543340415`). |
| **Sources** | Legacy `public/location.html` Accra card. Seed note in `branches.ts` (`id: "accra"`). |
| **Impact** | Low if the E.164 number is correct; high if the display string hid a different digit sequence. |
| **Human confirmation needed** | Confirm Accra branch phone digits and preferred public formatting. |

---

## 3. Kasoa service times missing

| Field | Value |
| --- | --- |
| **Current values** | Address and phone present. `serviceTimes: []`. Public UI uses a visitor-facing empty state (“Service times for this location will be published here when they are available”) rather than engineering language. |
| **Sources** | Legacy `public/location.html` Kasoa card (no schedule fields found). `branches.ts` (`id: "kasoa"`). |
| **Impact** | Kasoa visitors cannot plan attendance from the website alone. |
| **Human confirmation needed** | Official Sunday / midweek times for Kasoa (or confirmation that none should be published). |

---

## 4. Public Gmail vs legal `contact@kcmi-rcc.org`

| Field | Value |
| --- | --- |
| **Conflicting values** | Public **Contact page** seed: `kingdomcovenantministriesinter@gmail.com` (from legacy `contact-us.html`). Privacy Policy and Terms text: `contact@kcmi-rcc.org`. |
| **D1.3 note** | The global footer no longer displays the Gmail address; it links to **Contact KCMI** (`/contact`). The Contact page still shows the Gmail address. Daily Faith Recharge WhatsApp “message Subscribe” copy was removed from the footer; it remains on the Contact page next to the HQ phone. |
| **Sources** | `engagement.ts` public contact; `legal-privacy.ts` / `legal-terms.ts` migrated prose; legacy `privacy-policy.html` / `terms-of-service.html` / `contact-us.html`. |
| **Impact** | Split public identity; mail to the legal address may bounce or go unread if the mailbox is not monitored. |
| **Human confirmation needed** | Which address is authoritative for public contact vs legal notices? Align pages and legal text after counsel review (do not silently rewrite legal meaning without approval). |

---

## 5. Stale legacy-system references in Privacy / Terms

**Do not rewrite legal meaning in this pass.** Routes `/privacy` and `/terms` remain public. Seed `staleNotes` are maintainer-only (not rendered).

| Field | Value |
| --- | --- |
| **Privacy — camp/event registrations** | Names Google Sheet capture and **Google Drive** receipt storage. V2 target is Hub + private storage (ADR-0004). Phase 0 also notes historical **Cloudinary** camp receipt URLs. |
| **Privacy — §3 Google API Services** | Drive, Sheets, Calendar, Gmail APIs as used by the **legacy** site. |
| **Privacy — §§3–5 admin/security** | JWT admin console, **1-minute JWT expiry**, livestream **embed code** management, reCAPTCHA v2/v3. V2 Hub is Supabase Auth + MFA (ADR-0003); public bot protection is Turnstile (ADR-0005) where forms exist. |
| **Privacy / Terms contact** | `contact@kcmi-rcc.org` (see §4). |
| **Terms** | July 16, 2025 prose otherwise migrated faithfully. §1 host `https://kcmi-rcc.org` may need canonical-host confirmation at cutover. §4 third-party examples still match current outbound links (YouTube, TikTok, Google Forms). |
| **Sources** | `legal-privacy.ts`, `legal-terms.ts`; legacy HTML; `PHASE_0_INVENTORY.md`. |
| **Impact** | After V2 cutover, Privacy/Terms may misdescribe registration, receipts, auth, and admin access. |
| **Human / legal confirmation needed** | Counsel review to update Privacy/Terms for KCMI V2 architecture **before production**, without AI inventing new legal commitments. Marked **PRE-PRODUCTION LEGAL REVIEW REQUIRED** in seed `staleNotes`. |

---

## 6. Missing verified Facebook livestream video URL

| Field | Value |
| --- | --- |
| **Current values** | Livestream seed: `isLive: false`; Facebook **page** share URL only (no `/videos/` URL). Public page empty state: “We're not live right now. Follow KCMI on Facebook for live services and recent broadcasts.” |
| **Sources** | Legacy livestream UX depended on a separate backend embed path; no hard-coded verified video URL suitable for V2 seed. `pages.ts` livestream object; ADR-0007 Facebook model. |
| **Impact** | No in-page live player until a verified video (or page live plugin) URL is supplied and performance-reviewed. |
| **Human confirmation needed** | Canonical Facebook Page URL (if the share URL should change) and, when broadcasting, a verified live video URL or approved embed configuration for Hub editors. |

---

## 7. Featured programs / home empty state

| Field | Value |
| --- | --- |
| **Current values** | Home shows a visitor-facing empty state when no published Hub program is featured. No development placeholder is shown on the public site. |
| **Human confirmation needed** | Which program (if any) should be featured for staging review, including dates and image. |

---

## 8. Related non-blocking observations (not silent fixes)

| Topic | Note |
| --- | --- |
| HQ JSON-LD vs card hours | Legacy pages sometimes differed between schema/geo and card times. V2 Locations/Services use card/HQ service-time seeds; do not invent geo coordinates. |
| Zenith FX accounts | Present on legacy `giving-kcmi.html` and centralized in `giving.ts`. Inventory summaries that omitted Zenith should treat the HTML page as authoritative for C2. |
| Sermon catalog | Legacy sermons page was platform-oriented; V2 lists platforms plus Hub-published sermon rows when present — no invented title/speaker/date rows in seed. |
| Silverbird schedule | Public sermons copy uses Friday 8:00 pm from the legacy sermons page. Confirm this remains current before treating as production-complete. |
| First-party contact form | Not in this phase. Contact page directs visitors to email, phone, and Services forms. |

---

*Last updated: Phase D1.3 public content hygiene.*
