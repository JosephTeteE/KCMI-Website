# Legacy camp-deploy → V2 Events migration (D1.6A)

**Date:** 2026-09-08  
**Submodule:** `camp-deploy` → `https://github.com/JosephTeteE/kcmi-camp-temp.git`  
**Do not:** change `camp.kcmi-rcc.org` DNS, remove the submodule, or migrate/delete camp data in this pass.

Accepted V2 (ADR-0002):

- Canonical: `events.kcmi-rcc.org` → `/events` and `/events/[slug]`
- Vanity: `camp.kcmi-rcc.org` → eventually **redirect** to the current Camp Meeting event slug
- Do not keep a disposable per-camp architecture as the long-term platform

V2 today: `/events` and `/events/[slug]` are **E1 public content routes**; Hub Events editor is **E2** (`/admin/events`). Legacy `camp-deploy` remains untouched — **no** Camp content auto-migrated. See [`EVENTS_V1.md`](EVENTS_V1.md).

---

## Submodule inventory (VERIFIED in-repo)

Tracked camp files (sparse): `public/index.html` (single page), `public/css/youth-camp.css`, `public/css/styles.css` (copied main-site styles), `public/js/youth-camp-scripts.ts`, `public/js/scripts.ts` (WhatsApp DFR + reCAPTCHA v3), `package.json` (`tsc` only), `tsconfig.json`, `global.d.ts`.

**Routes/pages:** one public document, historically `public/camp/youth-camp.html` (HTML comment). Live host `https://camp.kcmi-rcc.org` (canonical in page meta).

| CURRENT LEGACY ITEM | V2 DESTINATION | MIGRATION REQUIRED? | VERIFIED / HUMAN | REDIRECT REQUIRED? |
|---|---|---|---|---|
| Host `camp.kcmi-rcc.org` | Redirect to `events.kcmi-rcc.org/{camp-slug}` when that slug exists | Yes (cutover) | VERIFIED ADR-0002 | **Yes** — do not retire host without redirect |
| Path `/` on camp host | `/events/{camp-slug}` (e.g. future `camp-2025` / `camp-2027`) | Yes | HUMAN: which year/slug is current | Yes |
| Legacy main-site `/youth-camp.html`, `/camp/youth-camp.html` | Same event slug | Yes | VERIFIED Phase 0 `vercel.json` on **legacy** Vercel; **V2 platform** now redirects `/youth-camp.html` and `/youth-camp` → `https://camp.kcmi-rcc.org` (bookmark compatibility only; Camp host unchanged) | Yes on www/apex; Camp host DNS unchanged |
| Page title / OG: “Youth and Teens Camp 2025 — Level Up” | Event record: title, theme, year | Yes | VERIFIED HTML; **may be stale** vs calendar | Meta follows event CMS |
| Canonical `https://camp.kcmi-rcc.org` | Event page canonical on events host | Yes | VERIFIED | After redirect, one canonical |
| Intro / “Level Up” theme copy | Event body/theme fields | Yes | VERIFIED HTML | n/a |
| Dates in copy “Aug 12–16, 2025” | Event `starts_at` / `ends_at` | Yes | VERIFIED copy; HUMAN confirm still accurate | n/a |
| Registration fee ₦30,000 / person | Event pricing (Events/registration — later) | Yes | VERIFIED HTML | n/a |
| Fee account: Access Bank **0097279229**, Eke Orji Eke | Event/payment config — **not** general giving CMS | Yes | VERIFIED HTML; HUMAN confirm still used | n/a |
| Donation prompt: Union Bank **0055484937** KCMI INT'L | Care-group/general giving vs event donation — HUMAN classify | Maybe | VERIFIED same Union account as main giving | n/a |
| Registration form: fullName, email, phone, numPeople | Event registration workflow | Yes | VERIFIED form + `youth-camp-scripts.ts` | n/a |
| Payment receipt upload (JPG/PNG/GIF/PDF ≤5MB) | **Private** storage + authorized access (never public Cloudinary URLs) | Yes | VERIFIED unsigned Cloudinary then POST URL | n/a |
| POST `https://kcmi-backend.onrender.com/api/camp-registration` | V2 server action / API + RLS | Yes | VERIFIED script | n/a |
| Google Sheet + SMTP on Render (legacy server) | Hub/ops inbox — architecture TBD in Events phase | Yes | VERIFIED Phase 0 | n/a |
| reCAPTCHA v2 on camp submit; v3 on WhatsApp modal | Turnstile (ADR-0005) on public writes | Yes | VERIFIED; do not copy recaptcha keys into V2 | n/a |
| WhatsApp DFR modal + `scripts.ts` | Main-site DFR (already seed on V2 footer/contact) | Duplicate, not camp-specific | VERIFIED phone +234 9134 44 8322 | No camp-only redirect |
| Nav links to kcmi-rcc.org pages + Google Forms | V2 routes + same forms until pastoral Hub | Partial | VERIFIED | Optional |
| Search-in-page, dark mode toggle, Bootstrap/AOS/Font Awesome | Do **not** copy; V2 design system | No (replace UX) | VERIFIED | n/a |
| Speakers list / session timetable | Not present as structured data in submodule | Unknown | **HUMAN**: if camp used speakers/schedule only in HTML prose, extract before 2025 page is taken down | n/a |
| Flyer / hero image | **No camp flyer in submodule** (~icons only) | Maybe | VERIFIED Phase 0 | n/a |
| Downloads/PDFs | None tracked in submodule | Unknown | HUMAN | n/a |
| `../css`, `../favicon` broken-base-href paths | Ignore; do not port | No | VERIFIED path debt | n/a |
| Client Cloudinary unsigned preset | Must **not** port | No — replace | VERIFIED security anti-pattern | n/a |

---

## Map onto V2 Events architecture

When Events is built (not this phase):

1. Create an event slug for the camp (HUMAN names the slug; do not invent “camp-2025” as published fact).
2. Staff edit **Events → {Camp}** (title, dates, body, pricing notes, hero) — not a separate camp CMS.
3. Registration + receipt evidence follow platform security (private storage, no permanent public receipt URLs).
4. `events.kcmi-rcc.org` rewrite already sketched in `next.config.ts`.
5. At cutover: DNS stays until humans point `camp.kcmi-rcc.org` at the V2 app **or** a redirect; this audit does not change DNS.
6. Keep `camp-deploy` in git until HUMAN confirms content extracted and redirects live.

---

## Events migration gaps (V2 repo)

| Gap | Status |
|---|---|
| Event entity / slug / publish | Not in schema |
| Hub Events IA | Nav disabled |
| Registration, receipts, anti-abuse | Not built (D2-adjacent / Events phase) |
| V2 redirects for `/youth-camp.html` / `/youth-camp` | Present in `campBookmarkRedirects` → `https://camp.kcmi-rcc.org` (bookmark compatibility; Camp DNS untouched) |
| Camp vanity redirect | Not configured; DNS untouched |
| Historical 2025 “Level Up” archive | HUMAN: publish as past event vs take down |

---

## Confirmation

Submodule **not** deleted. Camp DNS **not** changed. No camp data migrated.
