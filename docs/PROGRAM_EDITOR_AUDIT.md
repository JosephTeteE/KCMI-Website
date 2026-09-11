# KCMI Program Editor — Complete Task Audit

**Status:** AUDIT ONLY (2026-09-11)  
**Scope:** Add / edit Programs & Announcements as a first-time volunteer  
**Schema inspected:** `platform/supabase/migrations/20260907130000_cms_content.sql` (`public.programs`)  
**UI:** `/admin/programs`, `/admin/programs/new`, `/admin/programs/[id]`, `/admin/programs/[id]/preview`  
**No migration proposed or applied.**

---

## 1. Volunteer journey (current)

### A. Find the task

1. Sign in + MFA  
2. Dashboard card **Programs & Announcements** or nav item  
3. **New program**

### B. Create draft (`/admin/programs/new`)

Fields presented in one screen:

| Field | Control | Volunteer meaning | Confusion risk |
| --- | --- | --- | --- |
| Title | text | Program name | Low |
| Short description | textarea | Card blurb | Medium — vs Full details |
| Full details | textarea | Long copy | Medium — where shown publicly? |
| Starts | `datetime-local` | Start | Medium — timezone unclear |
| Ends | `datetime-local` | End | High if unknown / multi-day |
| Button visitors can click | text | CTA label | Medium |
| Button destination | text URL/path | Registration / info link | High for first-timers |
| Show on the homepage? | select (`none`/`featured`/`banner`/`card`) | Spotlight? | **High** — overlaps Homepage Spotlight |
| Program poster | library select only | Photo | High — **cannot upload here**; must use library or edit later |
| Save as a draft | submit | Not public | Clear |

### C. Edit existing (`/admin/programs/[id]`)

1. **Preview this program** link → separate preview route  
2. **Program details** via `HubCopyProposeForm` (Change → Preview → Make live)  
   - Starts/Ends are **plain text** fields here (not `datetime-local`) — inconsistent with create  
3. **Poster** section: Current photo + Replace Photo upload + optional library picker  
4. **Publish** block: Make live / Remove / Restore depending on status  

### D. Homepage Spotlight coupling

- Create/edit `placement=featured` **and/or** Homepage Spotlight chooser (`featuredProgramId` + takeover settings)  
- Two doors to the same public outcome → training burden  

---

## 2. Schema representation (current)

`public.programs`:

| Column | Type | Notes |
| --- | --- | --- |
| `title` | text | Required |
| `slug` | text | Unique; system-derived |
| `short_description` | text | Card |
| `body_text` | text | Long form |
| `starts_at` / `ends_at` | timestamptz nullable | Single interval only; check `ends_at >= starts_at` |
| `featured_media_id` | uuid → media | One poster |
| `cta_label` / `cta_url` | text nullable | One button |
| `placement` | enum | `none` / featured / banner / card |
| `status` | publication_status | draft / preview / published / archived |

**Not modeled:** location, online vs physical, per-day sessions, multiple CTAs, registration capacity, timezone label, “TBD end”, session rooms.

Public card `datesLabel` is derived from start (edit preview uses `starts_at` string), not a rich schedule.

---

## 3. Confusing fields / controls (first-timer lens)

1. **Show on the homepage?** options beyond a simple yes/no.  
2. **Poster only from library on create** — contradicts contextual-upload mental model used elsewhere.  
3. **Starts/Ends widget differs** between create and edit.  
4. **Button destination** raw URL with light hint only.  
5. **Full details** unclear surface on public site.  
6. **Placement vs Spotlight takeover** advanced settings live on Homepage, not Program.  
7. **Make live** vs **Save my program details** label switching by status.  
8. No guided “Is this a one-day service or a multi-day convention?”  

---

## 4. Real-world scenario matrix

| ID | Scenario | Supported cleanly? | Notes |
| --- | --- | --- | --- |
| **A** | One-day Sunday program | **Partial** | Single interval works; no Sunday template; public label is date-oriented |
| **B** | Evening service with start/end time | **Partial** | Times **stored** in timestamptz; **public `datesLabel` drops times** (date-only formatting in supabase-public adapter) |
| **C** | Five-day convention | **Weak** | start+end dates only; no location/agenda |
| **D** | Five-day convention, two sessions some days | **No** | No session model |
| **E** | Event with registration link | **Yes** | CTA label + URL |
| **F** | Event with YouTube promo | **Partial / split** | Not on program row; Homepage Spotlight `spotlightPromoVideoUrl` or misuse CTA |
| **G** | Event with no registration | **Yes** | Empty CTA; full preview may omit button — card preview can still show fallback “Learn more” |
| **H** | Program without known end time | **Yes (schema) / Partial (UI)** | `ends_at` nullable; UI lacks explicit TBA control |

---

## 5. Publishing & safety

| Step | Protects live site? |
| --- | --- |
| Save draft on create | Yes |
| Propose + Preview gate on edit | Yes for copy |
| Poster replace | More direct; relies on staff care |
| Make live | Explicit, but easy to reach after preview |
| Homepage featured placement | Can put draft expectations in conflict if placement set before publish |

---

## 6. Score (Program product)

| Dimension | Score | Reason |
| --- | --- | --- |
| Clarity | NEEDS IMPROVEMENT | Placement/Spotlight dual path |
| Schedule power | **FAIL** | Cannot express D; weak C/H |
| Media | NEEDS IMPROVEMENT | Create lacks contextual upload |
| CTA model | PASS for single link | Fails if multiple actions needed |
| Cognitive load on create | **FAIL** | Too many unrelated decisions |
| Error prevention | PASS | Draft-first |

---

## 7. Redesign inputs (not implementing)

1. Split **Create basics** (name, blurb, poster) from **Schedule** from **Public button** from **Homepage feature**.  
2. Schedule patterns: one-day · range · multi-session builder.  
3. CTA: optional single content action; structural links stay engineering-owned on Homepage.  
4. One Spotlight control surface.  
5. Align create/edit datetime UX.  
6. Allow contextual upload on create.

---

## D1.8 after-state

| Item | Status |
| --- | --- |
| Guided New Program wizard (5 steps) | **Done** — `ProgramCreateWizard` |
| One optional visitor action + derived labels | **Done** — `action_kind` + `programActionLabel` |
| `program_sessions` additive model + backfill migration | **Done (file)** — `20260911140000_program_sessions_d18.sql` — **not applied to hosted staging** |
| Public schedule labels include times | **Done** — `formatProgramScheduleLabel` in public adapter |
| Multi-day / multi-session scenarios A–H | **Supported in model/wizard**; authenticated interaction matrix partial |
| No Spotlight on create | **Done** |
| Edit-path session UI | **Partial** — create path primary; edit retains compatibility fields |

Deprecation path: keep `programs.starts_at` / `ends_at` temporarily; adapters prefer sessions when present; remove legacy columns only after all Hub/public consumers migrate.
