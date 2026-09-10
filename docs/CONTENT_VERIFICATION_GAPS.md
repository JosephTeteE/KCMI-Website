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
| **D1.6B resolution for public site** | Canonical public email is **`contact@kcmi-rcc.org`**. The media-team Gmail is a Hub login identity, not the primary website contact. |
| **Human confirmation still needed** | Confirm the `contact@kcmi-rcc.org` mailbox is monitored for public and privacy enquiries before production. |

---

## 5. Stale legacy-system references in Privacy / Terms

**D1.6B:** Public `/privacy` is now a **factual V2 draft** (no Google Drive / Sheets / JWT / reCAPTCHA claims). It is marked **PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED**. See `docs/DATA_PROCESSING_INVENTORY.md` and `docs/PRIVACY_PREPRODUCTION_REVIEW.md`.

`/terms` remains the July 16, 2025 legacy Terms (legal meaning not rewritten). Counsel should confirm the named host at cutover.

| Field | Value |
| --- | --- |
| **Terms host** | §1 names `https://kcmi-rcc.org`. Confirm apex vs `www` at cutover. |
| **Terms §4** | YouTube, TikTok, and Google Forms still match current outbound links. |

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
| **Current values** | Home **hides** the featured-program block when no published featured program exists. |
| **Human confirmation needed** | Which program (if any) should be featured for staging review, including dates and image. |

---

## 8. Related non-blocking observations (not silent fixes)

| Topic | Note |
| --- | --- |
| HQ JSON-LD vs card hours | Legacy pages sometimes differed between schema/geo and card times. V2 Locations/Services use card/HQ service-time seeds; do not invent geo coordinates. |
| Zenith FX accounts | Present on legacy `giving-kcmi.html` and centralized in `giving.ts`. Inventory summaries that omitted Zenith should treat the HTML page as authoritative for C2. |
| Sermon catalog | Legacy sermons page was platform-oriented; V2 lists platforms plus Hub-published sermon rows when present — no invented title/speaker/date rows in seed. |
| Silverbird schedule | **Withheld** from the public sermons page until confirmed. Do not republish “Fridays, 8:00 pm” without human verification. |
| TikTok identity | Public label is **Apostle Frank on TikTok** (`https://www.tiktok.com/@frank.aikins`). Do not call it “KCMI TikTok” unless a KCMI-branded account is verified. Canonical vs share-query Facebook URL remains in §6. |
| First-party contact form | Not in this phase. Contact page directs visitors to email, phone, and Services forms. |

---

*Last updated: Phase D1.6B public CMS coverage.*
