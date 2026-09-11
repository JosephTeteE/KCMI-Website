# KCMI Hub — Interaction Map (D1.7 current state)

**Status:** AUDIT ONLY (2026-09-11)  
**Tree:** D1.7 working tree on `rebuild/kcmi-v2`  
**Method:** Source inventory + authenticated read-only Playwright walk (`scripts/hub-product-audit.mjs`) against local production build + hosted staging Auth.  
**Evidence:** `platform/.qa-hub-product-audit/` · `~/Downloads/kcmi-hub-product-audit.zip`

No product code, schema, or hosted CMS content was changed for this audit.

---

## 1. Route inventory

| Route | Purpose (volunteer task) | Playwright status | Visible controls (sample load) |
| --- | --- | ---: | ---: |
| `/auth/sign-in` | Sign in with email/password | 200 | 3 |
| `/auth/mfa` | Enter authenticator code | 200 | 2 |
| `/admin` | Choose what to update (dashboard) | 200 | 20 |
| `/admin/website` | Choose which website page to edit | 200 | 17 |
| `/admin/website/home` | Edit Homepage sections / Spotlight / photos | 200 | 32 |
| `/admin/website/about` | Edit About sections / portrait | 200 | 20 |
| `/admin/website/services` | Edit Services page copy & CTAs | 200 | 16 |
| `/admin/website/sermons` | Edit Sermons page platforms copy | 200 | 16 |
| `/admin/website/faqs` | Edit FAQ items | 200 | 16 |
| `/admin/website/global` | Edit contact / social / footer / DFR | 200 | 16 |
| `/admin/programs` | List programs; open or create | 200 | 12 |
| `/admin/programs/new` | Create draft program | 200 | 22 |
| `/admin/programs/[id]` | Edit / publish / poster / placement | code | (dynamic) |
| `/admin/programs/[id]/preview` | Preview program as visitor card | code | (dynamic) |
| `/admin/sermons` | List sermons | 200 | 12 |
| `/admin/sermons/new` | Create draft sermon | 200 | 20 |
| `/admin/sermons/[id]` | Edit / publish sermon | code | (dynamic) |
| `/admin/media` | Photo library upload / archive | 200 | 21 |
| `/admin/branches` | List branches | 200 | 18 |
| `/admin/branches/[id]` | Edit branch details / times / photos | code | (dynamic) |
| `/admin/livestream` | Start / change / turn off Facebook live | 200 | 13 |

**Also reachable from Hub chrome (not separate product areas):**

- Side nav / mobile Menu: Dashboard, Website pages, Programs & Announcements, Sermons, Photos, Branches, Livestream, Help & Tutorial, Sign out
- `/api/hub/session` (API; not a volunteer screen)

**Totals:**

| Source | Count |
| --- | ---: |
| Playwright first-paint probe (17 static routes) | **381** nodes · **276** visible · **~260** unique route+label pairs |
| Source-union catalog (all mutually exclusive editor views, excl. dynamic list rows) | **≈ 430** distinct actionable controls ([Audit Hub editors controls](dda09fe7-b275-43d7-af3d-a962a9640495)) |
| Plus dynamic rows | +programs +sermons +branches +media archive buttons +attention links |

Expanded Homepage visual editor (section → category → Change) and Program/Branch detail editors expose controls beyond first-paint counts.

---

## 2. Shared chrome controls (every Hub page)

| Label | Type | Purpose | Result | Necessary? | Understandable? | Duplicative? | Safe? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Menu (mobile) | button | Open nav drawer | Opens `#hub-mobile-menu` dialog | Yes | Yes | No | Yes |
| Close | button | Close drawer | Closes dialog | Yes | Yes | No | Yes |
| Dashboard…Livestream | links | Navigate areas | Route change | Yes | Mostly | Overlaps dashboard cards | Yes |
| Help & Tutorial | menu | Replay tour / help | Opens help; can replay tour | Yes | Yes | Tour also auto-prompts | Yes |
| Sign out | submit | End session | Signs out | Yes | Yes | No | Yes |
| Hub Tour overlay | dialog | Guided steps | Highlights targets; can navigate | Mixed | Mixed | Cross-route mega-tour | **Unsafe UX** (see tour) |

---

## 3. Per-route control map (condensed)

### `/auth/sign-in`

| Label | Type | Purpose | Result | Necessary | Understandable | Duplicative | Safe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Email | field | Identity | Local form state | Yes | Yes | No | Yes |
| Password | field | Auth | Local form state | Yes | Yes | No | Yes |
| Sign in / Continue | submit | Authenticate | Session or MFA redirect | Yes | Yes | No | Yes |

### `/auth/mfa`

| Label | Type | Purpose | Result | Necessary | Understandable | Duplicative | Safe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Code | field | TOTP | Verify AAL2 | Yes | Yes | No | Yes |
| Verify | submit | Complete MFA | Enter Hub | Yes | Yes | No | Yes |

### `/admin` Dashboard

| Label | Type | Purpose | Result | Necessary | Understandable | Duplicative | Safe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage / Programs / Branches / Livestream / Sermons / Photos cards | links | Pick task | Navigate | Yes | Yes | Duplicates side nav | Yes |
| Attention list → branch | links | Fix missing times/phones | Branch editor | Yes | Yes | No | Yes |
| Recent activity (if permitted) | text/links | Awareness | Read-only | Optional | Medium | No | Yes |
| Tour welcome / Show me around / Skip | dialog | First-run help | Starts or dismisses tour | Yes | Yes | No | Yes |

### `/admin/website`

| Label | Type | Purpose | Result |
| --- | --- | --- | --- |
| Home / About / Services / Sermons / FAQs / Global cards | links | Choose document | Nested website editors |

### `/admin/website/home` (highest cognitive load)

**Views:** overview section chooser → section categories (Words / Photo / Buttons / Featured program) → Change form → Preview → Make live.

| Control family | Type | Purpose | Result | Necessary | Understandable | Duplicative | Safe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ← Website pages | link | Back to page list | `/admin/website` | Yes | Yes | Competes with nav | Yes |
| Section tiles (Top of Homepage…Prayer & Giving) | buttons | Choose section | Section view | Yes | Yes | No | Yes |
| Words / Photo / Buttons | buttons | Choose edit category | Category view | Yes | Yes | No | Yes |
| Back to {section} choices | button | Leave category | Section view | Yes | Medium | Extra Back concept | Yes |
| Change this section | button | Enter propose mode | Editing fields | Yes | Yes | Pattern reused | Yes |
| Field dump (headline, CTAs, URLs, verses…) | inputs | Edit copy | Local proposed | Mixed | **Hard for first-timer** | Many raw URLs | Preview gate helps |
| Preview my changes | button | Gate publish | Enables Make live | Yes | Yes | No | Yes |
| Make this live on the website | submit | Publish document | Mutates `website_documents` | Yes | Yes | No | **Destructive to live** if misused |
| Cancel changes | button | Discard propose | Exit edit | Yes | Yes | No | Yes |
| Replace Photo (hero/welcome) | file+submit | Contextual photo | Upload + attach | Yes | Yes | Also Media Library | Safer than library-first |
| KCMI Spotlight chooser | select+checkboxes+dates+URL | Featured program + takeover | Publishes featured placement | Mixed | **Advanced dump** | Overlaps Programs placement | Live risk |
| View full-size preview | button | Readable preview | Modal | Yes | Yes | Needed because thumbnail illegible | Yes |

### Other website editors (`about`, `services`, `sermons`, `faqs`, `global`)

Shared pattern: `HubCopyProposeForm` (Current → Change → Preview → Make live) + `HubPreviewFrame` + optional contextual `MarketingImageUploader` (About portrait).

| Notable controls | Notes |
| --- | --- |
| ← Website pages | Consistent header Back |
| Change / Preview / Make live / Cancel | Same lifecycle |
| Services cell/teams CTA label+href | Raw URL flexibility |
| FAQs add/edit items | Multi-item dump |
| Global social URLs / contact | Technical URL fields |

### Programs

| Route | Key controls |
| --- | --- |
| `/admin/programs` | New program; row links; status badges |
| `/admin/programs/new` | Title, descriptions, Starts/Ends (`datetime-local`), CTA label/URL, Show on homepage?, library poster select, Save draft |
| `/admin/programs/[id]` | Propose details form; Preview link; Replace Photo; library select; Make live / Remove / Restore |
| `/admin/programs/[id]/preview` | ← Back to editor; public-ish card |

### Sermons / Media / Branches / Livestream

| Area | Key controls | Safety |
| --- | --- | --- |
| Sermons list/new/edit | Draft fields, YouTube URL, publish lifecycle | Publish mutates public |
| Media | Upload, crop aspect radios, Check how photo will look, Gallery, **Remove from library** | Archive is destructive |
| Branches list/[id] | Details propose form; service time rows; maps fields; upload/remove branch photos | Live branch page |
| Livestream | Paste Facebook embed/URL; Start / Change / Turn off | Immediate public live state |

---

## 4. Back / navigation findings

### Competing Back concepts today

1. **Hub side nav / Menu** — always available (primary IA).
2. **`HubPageHeader` ← Back** — parent list (e.g. ← Website pages, ← All programs, ← All branches, Back to editor).
3. **In-editor “Back to {section} choices”** — Homepage/About visual IA (not browser history).
4. **Tour “Back”** — previous coach-mark step (same label as page Back).
5. **Browser Back** — uncontrolled; can break propose/edit state.

### Screens with multiple Back concepts

- Homepage visual editor: header ← Website pages + in-flow Back to section choices + Tour Back + Menu.
- Program preview: Back to editor + nav.
- Any mobile Hub page during tour Help step: Menu dialog + Tour Back/Next.

### Recommended hierarchy (proposal only)

1. **Persistent Hub nav** = area switching (Dashboard, Programs, …).
2. **One page Back** = parent list only (`HubPageHeader`), label = destination (“Website pages”), never bare “Back” when ambiguous.
3. **In-flow secondary** = “Choose a different section” (not “Back”).
4. **Tour** = “Previous step” / “Next step” (never “Back”).
5. Do not rely on browser history for editor state.

---

## 5. Button / destination audit (visitor CTAs operators can edit)

| Public section | Default label | Label editable? | Destination | Dest editable? | Input type | Staff need? | Class |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home hero primary | Plan a Visit | Yes | `#worship` | Yes | text URL/path | Rarely | **A STRUCTURAL** |
| Home hero secondary | Watch Live | Yes | `/livestream` | Yes | text | Rarely | **A** |
| Watch & Listen CTA | Listen now | Yes | `/sermons` | Yes | text | Rarely | **A** |
| Watch YouTube label/URL | YouTube · @rehoboth-tv | Yes | YouTube | Yes | text | Sometimes | **B CONTENT** |
| Prayer CTA | Submit Prayer Request | Yes | Google Form | Yes | text URL | Until Pastoral Hub | **B** (temporary) |
| Giving CTA | Give Now | Yes | `/giving` | Yes | text | Until D2 config | **B** / later structural |
| Locations supporting (not a button field dump beyond heading) | Find path via section | Copy only | `/locations` in UI | Partial | — | — | **A** |
| Services Cell CTA | Join a Cell Fellowship | Yes | Form URL | Yes | text | Yes (form may change) | **B** |
| Services Teams CTA | Join a Service Team | Yes | Form URL | Yes | text | Yes | **B** |
| Program card CTA | (empty / Learn more) | Yes | any https/path | Yes | text | **Yes** (registration/promo) | **B** |
| Spotlight promo video URL | — | — | video URL | Yes | text | Occasional | **B** |
| Sermons page platforms | page fields | Yes | platform URLs | Yes | text | Yes | **B** |
| Global social links | labels/URLs | Yes | social URLs | Yes | text | Yes | **B** |

**C UNNECESSARY FLEXIBILITY (audit opinion):**

- Editing structural hero destinations (`Plan a Visit` → `#worship`, `Watch Live` → `/livestream`) for ordinary volunteers.
- Homepage “Show on homepage?” placement enums (`featured` / `banner` / `card`) overlapping Spotlight chooser.
- Free-text datetime strings on Program **edit** path vs `datetime-local` on create (inconsistent).

---

## 6. Media workflow

### Paths that can change photos

| Path | Upload | Choose existing | Replace | Assign | Remove | Library |
| --- | --- | --- | --- | --- | --- | --- |
| Homepage hero/welcome (contextual) | Yes (`uploadWebsiteContextImage`) | Via media id fields / prior | Replace Photo | Yes | Indirect | Optional |
| About portrait | Yes | — | Replace Photo | Yes | — | Optional |
| Program poster | Yes (`uploadProgramCover`) | Library select on editor | Replace Photo | Yes | Clear select | Optional |
| Branch top/gallery | Yes on branch page | — | Upload | Yes | Remove photo | Optional |
| `/admin/media` | Yes | N/A | N/A | No page assign UI | Archive/remove | **Central** |

### Answers

| Question | Answer |
| --- | --- |
| Homepage photo without Media Library first? | **Yes** — contextual Replace Photo on Homepage editor. |
| Program poster contextual? | **Yes** on edit (+ library picker). **No** inline upload on `/admin/programs/new` (library select only). |
| Branch Top Photo contextual? | **Yes** — upload on `/admin/branches/[id]` (no “choose existing library” UI). |
| Media Library duplicated? | **Partial** — same uploader kit; library = orphan upload + gallery + archive. Home/About/Branch **cannot pick existing** library photos; Programs/Sermons can. |

### Mental model

| Intended (copy already hints) | Actual |
| --- | --- |
| Prefer replace photo **where it appears** | Mostly true for Home/About/Program/Branch |
| Library = shared pool for later assignment | Pool exists; assignment UI incomplete (home/about/branch can’t pick existing) |
| Preview before live for everything | **False for contextual Home/About photos** — `uploadWebsiteContextImage` writes media id and **publishes immediately** (“The new photo is now on the website.”). Copy still uses propose→preview→live. |
| Branch/livestream photo/live changes | Also mutate public without the same propose gate as copy forms |

---

## 7. Visual preview responsiveness

**Component:** `HubPreviewFrame` — fixed **960px** canvas, `transform: scale(fit)` into card width; `pointer-events-none`; **View full-size preview** modal (~960px scroll).

| Surface | Preview? | Classification | 390 / 768 / 1280 notes |
| --- | --- | --- | --- |
| Homepage sections | Yes | **C both attempted** | At 390, scale ≪ 1 → public type ~14px in frame; illegible thumbnail pretending to be proof |
| About | Yes | C | Same |
| Program card | Yes | C | Same |
| Sermon | Yes | C | Same |
| Branch | Yes | C | Same |
| Livestream | Yes | C | Same |
| Full-size modal | Yes | **B readable** (desktop width) | Best current readable path; still not true device CSS (`100vw` media queries follow **browser** viewport, not 960 canvas) |

**Core conflict:** Public CSS is viewport-driven; Hub scales a desktop canvas. Narrow Hub cards shrink text below floors → volunteers cannot trust thumbnail as “what mobile looks like.”

Playwright 390 Homepage preview evidence: scaled frames present (`hasScaleTransform: true`); screenshots in evidence ZIP.

---

## 8. One-task-per-screen flags

| Screen | Problem |
| --- | --- |
| Homepage editor | Section IA + words + URLs + photos + Spotlight takeover settings in one product area |
| Featured program chooser | Placement + takeover enable + mode + promo URL + date window together |
| Program create | Identity + schedule + CTA + homepage placement + poster in one form |
| Program edit | Details propose + poster + publish lifecycle stacked |
| Branch edit | Identity + phones + maps + multi service times + photos |
| Global website | Contact + social + footer + DFR together |
| Media upload | File + aspect radios + caption + prepare in one card |

---

## 9. Accessibility / interaction (spot)

| Check | Finding |
| --- | --- |
| Focus-visible / min-h-11 buttons | Generally present on Hub actions |
| Touch targets ~44px | Primary buttons OK; some text links/`text-sm` chrome are shorter |
| Labels | Most Hub fields use labelled components |
| Tour dialog | `aria-modal`; Escape finishes tour (also skips remainder) |
| Mobile menu dialog | Native `<dialog>`; **blocks** tour Next when left open (confirmed) |
| Disabled Make live until preview | Good error-prevention |
| Sign out / Remove / Turn off | Available without always requiring typed confirm |

---

## 10. Route scorecard

| Route | Clarity | Readability | Navigation | Cognitive load | Error prevention | Responsiveness | A11y | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/auth/sign-in` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| `/auth/mfa` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| `/admin` | PASS | NEEDS IMPROVEMENT (`text-sm` chrome) | PASS | PASS | PASS | PASS | PASS | NEEDS IMPROVEMENT (nav vs cards) |
| `/admin/website` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| `/admin/website/home` | NEEDS IMPROVEMENT | **FAIL** (preview scale) | NEEDS IMPROVEMENT (multi Back) | **FAIL** | PASS (preview gate) | **FAIL** | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT |
| `/admin/website/about` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | PASS | FAIL | NEEDS IMPROVEMENT | PASS |
| `/admin/website/services` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | PASS | NEEDS IMPROVEMENT | PASS | FAIL | PASS | PASS |
| `/admin/website/sermons` | PASS | NEEDS IMPROVEMENT | PASS | NEEDS IMPROVEMENT | PASS | FAIL | PASS | PASS |
| `/admin/website/faqs` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | PASS | NEEDS IMPROVEMENT | PASS | FAIL | PASS | PASS |
| `/admin/website/global` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | PASS | **FAIL** | PASS | FAIL | PASS | PASS |
| `/admin/programs` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| `/admin/programs/new` | NEEDS IMPROVEMENT | PASS | PASS | **FAIL** | PASS | PASS | PASS | NEEDS IMPROVEMENT |
| `/admin/programs/[id]` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | **FAIL** | PASS | FAIL | PASS | NEEDS IMPROVEMENT |
| `/admin/programs/[id]/preview` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| `/admin/sermons*` | PASS | PASS | PASS | NEEDS IMPROVEMENT | PASS | NEEDS IMPROVEMENT | PASS | PASS |
| `/admin/media` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT (`text-sm` labels) | PASS | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT (easy archive) | PASS | PASS | NEEDS IMPROVEMENT |
| `/admin/branches*` | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | PASS | **FAIL** | PASS | FAIL | PASS | PASS |
| `/admin/livestream` | PASS | NEEDS IMPROVEMENT | PASS | NEEDS IMPROVEMENT | NEEDS IMPROVEMENT | FAIL | PASS | PASS |

---

## 11. Top 10 Hub UX problems (priority)

1. **Cross-route mega-tour failure (Help → Homepage):** mobile `#hub-mobile-menu` left open intercepts Tour Next; tour measure effect deps `[active, step]` never remeasure after `router.push` ([Audit media programs preview](2c2c2380-b29c-4b4a-9261-0fa270ffa0fb)).
2. **Preview thumbnails illegible** (960 canvas scaled; public viewport CSS ≠ card).
3. **Homepage editor cognitive overload** (sections + CTAs/URLs + Spotlight advanced).
4. **Contextual Home/About photo replace publishes immediately** — bypasses Current→Change→Preview→Make live.
5. **Multiple competing Back concepts** (header / in-flow / tour / browser).
6. **Program schedule model too weak** for multi-day / multi-session reality (see Program audit).
7. **Structural CTAs fully editable** without operational need.
8. **Placement controls duplicated** (`banner`/`card` unused; Spotlight vs `placement`).
9. **Media Library vs contextual upload** split + incomplete “choose existing” coverage.
10. **Computed 14px Hub chrome / scaled preview text** + under-guarded live/destructive actions.

---

## 12. Evidence references

- Interaction counts & route table: `audit-results.json`
- Screenshots: `screenshots/admin_website_home-preview-390.png`, `*-typo-390.png`, etc.
- Trace: `traces/hub-product-audit.zip`
- Tour intercept proof: Playwright log — `#hub-mobile-menu` dialog subtree intercepts Tour **Next**; complementary code finding — measure effect does not re-run after cross-route navigation ([Audit media programs preview](2c2c2380-b29c-4b4a-9261-0fa270ffa0fb))

---

## 13. D1.8 after-state (implementation)

**Status:** FINAL CLOSURE — contextual tours route-specific; multi-day day→session UI  
**Evidence:** `platform/.qa-d18-final-closure/` · `~/Downloads/kcmi-d18-final-closure.zip`  
**Computed typography:** 151 → **0** (unchanged this closure; no typography CSS floor changes)  
**Program A–H:** prior pass 8/8; C/D re-verified with day grouping  
**Media A–E:** prior pass (unchanged this closure)

| Focused state | Visible actionable controls | Notes |
| --- | ---: | --- |
| program-wizard-step2-when several-days (full page, prior) | 45 | Before day grouping |
| program-multi-day-builder only (after) | **31** | Date once per day; sessions under day |
| program-wizard-step1-about | 16 | Unchanged |
| program-wizard-step3-where | 16 | Unchanged |

| Area | After closure |
| --- | --- |
| Contextual tours | Route-resolved kinds: home / programs / livestream; never reuse dashboard Homepage steps |
| Target miss | Short search then “This step isn’t available right now” + Skip step / Exit |
| Mobile menu tour | Tour uses top-layer dialog so coach mark sits above native menu dialog |
| Multi-day UI | Day → sessions[]; flatten to `program_sessions` on save; last session on only day clears to empty row |
| Media Library “Used on” | Still optional / non-blocking |

**Still deferred by design:** hosted staging migration; local Supabase apply when Docker healthy.
