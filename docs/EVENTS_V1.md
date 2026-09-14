# Events V1 — E1 public + E2 Hub editor + E3 registration

**Status:** E1 public experience + E2 Hub Events editor + E3 public registration  
**Does not authorize:** payment evidence (E4), Camp content migration (E5), Search Event indexing, Giving, Pastoral.

## Events ≠ Programs

- **Programs** remain homepage/features announcements with optional visitor CTA URLs.
- **Events** are first-class gatherings (`/events`, `/events/[slug]`).
- Programs may link to `/events/[slug]` via existing CTA URL fields.
- **V1 does not** add `programs.linked_event_id`.

## E1 data model (`public.events`)

| Field | Notes |
| --- | --- |
| `slug`, `title`, `theme`, `summary`, `body_text` | Public content |
| `event_kind` | `camp` \| `conference` \| `convention` \| `retreat` \| `special_service` \| `other` |
| `status` | Reuses `publication_status`: draft \| preview \| published \| archived |
| `featured_media_id` | Existing `media_assets` only — no Events bucket |
| `starts_at`, `ends_at`, `timezone` | Multi-day ranges supported |
| `venue_label`, `venue_city`, `venue_country` | Free-text venue |
| `location_branch_id` | Optional link to public `church_branches` |
| `contact_email`, `contact_phone_display` | Optional visitor contact |
| `published_at`, audit columns | Matches CMS pattern |

## E3 registration configuration (on `events`)

| Field | Notes |
| --- | --- |
| `registration_enabled` | Default **false** — existing Events stay closed |
| `registration_opens_at` | Optional window start |
| `registration_closes_at` | Optional window end |
| `capacity` | Optional total party-size limit; null = unlimited |

**Not in E3:** fee, bank account, payment required, receipt settings (E4).

## E3 `event_registrations` (private)

| Field | Notes |
| --- | --- |
| `reference_code` | Unique `KCMI-XXXXXX` (non-sequential) |
| `full_name`, `email`, `phone`, `num_people` | Visitor fields only |
| `status` | `submitted` \| `confirmed` \| `cancelled` |
| `submitted_at` | Server timestamp |

No DOB, medical, ID docs, address, gender, emergency contacts, pastoral notes, or `payment_status` in E3.

**Retention (provisional, documented only):** 12 months after Event end. Automated deletion is **not** implemented in E3.

### Duplicate protection

Same Event + same email within **5 minutes** returns the existing registration (idempotent). Does not permanently block later family registrations sharing an email.

## Publication semantics

| Status | Public `/events` | Public `/events/[slug]` | Metadata |
| --- | --- | --- | --- |
| `published` | Yes (upcoming or past by date) | Yes | Title/summary OK |
| `draft` | No | 404 | Generic “Event” only |
| `preview` | No | 404 | Generic “Event” only |
| `archived` | No (intentionally removed from site) | 404 | Generic “Event” only |

Past **published** events remain listed under **Past Events** after their end (or start) date.

## RLS

### E1 (read)

- `anon` / public: **SELECT** where `status = 'published'` only.
- `authenticated`: published **or** `hub.access` (staff may read drafts in Hub).
- Service-role remains server-only.

### E2 (write)

- Migration: `platform/supabase/migrations/20260914190000_events_e2_hub_writes.sql`
- INSERT/UPDATE: `has_permission('events.manage')` only.
- No DELETE policy — remove from website via `archived`.
- `media_admin` gains `events.manage` in DB + `DEFAULT_ROLE_PERMISSIONS`.
- `media_admin` still has **no** `registrations.manage` / `payment_evidence.review`.

### E3 (registrations)

- Migration: `platform/supabase/migrations/20260914192000_events_e3_registration.sql`
- Public / anon: **NO** SELECT, INSERT, UPDATE, DELETE on `event_registrations`
- Authenticated: SELECT/UPDATE only with `registrations.manage` (not `hub.access` alone)
- No authenticated INSERT — inserts via `admin_register_for_event` (**service_role only**)
- Occupancy count helper `public_event_registered_people(uuid)` returns a number for published Events only (no rows)

## Submission architecture (E3)

```
Browser form
  → Next.js server action `registerForEvent`
  → validate fields + rate limit (hashed event+email)
  → Cloudflare Turnstile server verify
  → service-role RPC `admin_register_for_event` (row lock + capacity)
  → optional Resend confirmation email
  → safe confirmation + reference code
```

- Never use anon/authenticated table INSERT from the browser.
- Never expose `SUPABASE_SECRET_KEY` to client code.
- Registration succeeds even if Resend is unconfigured or send fails.

### Turnstile

| Env | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Widget site key |
| `TURNSTILE_SECRET_KEY` | Server verify |
| `TURNSTILE_TEST_MODE=1` / `NEXT_PUBLIC_TURNSTILE_TEST_MODE=1` | Non-production only; token `TEST_PASS` |

Production / `KCMI_ENVIRONMENT=production` never accepts test bypass.

### Resend (optional)

| Env | Purpose |
| --- | --- |
| `RESEND_API_KEY` | API key |
| `RESEND_FROM_EMAIL` | From address |

## Public routes

- `/events` — Upcoming + Past; calm empty state when none.
- `/events/[slug]` — Content + registration CTA/form when eligible.
- Eligibility messages: not open yet / Registration closed / Registration full.
- Confirmation copy does **not** claim payment confirmed or seat guaranteed.
- Hostname rewrite unchanged: `events.kcmi-rcc.org/:path*` → `/events/:path*` (ADR-0002).

## Hub Events (E2 + E3 settings)

Routes: `/admin/events`, `/admin/events/new`, `/admin/events/[id]`

Wizard steps: Details → When → Where → Photo → Contact → **Registration** → Review

| Flow | Behaviour |
| --- | --- |
| Create | Always `draft`; primary action **Save as a draft** |
| Draft edit | Change → Preview → **Save draft changes**; **Make this live** is separate |
| Published edit | Current → Change → Preview → **Make these changes live** (registration config included) |
| Photo | Upload new / choose existing; live only after Make Live on published rows |
| Archive | **Remove from public website** → `archived` with confirm; restore to draft |

### Hub registrations (E3 minimum)

- `/admin/events/[id]/registrations` and detail route
- Requires `registrations.manage` (registrar / super_admin)
- View reference, name, email, phone, party size, submitted time, status
- **No** CSV export, payment, or receipt UI

### Slug policy

- Create / draft: slug from title; collisions get `-2`, `-3`, …
- **Published / archived:** slug is **stable** — title edits do not rewrite the public URL

### Audit / revisions

- `writeAuditEvent` on create, draft/live update, publish, archive, restore
- Live/draft updates include registration config diffs in audit metadata when changed (no registrant PII)
- `saveRevision` with `entity_type='event'` on publish/archive/restore and live content updates
- Snapshots may include registration **configuration** fields; never full registration row PII

## Permissions

| Role | Content | Registrations | Payment evidence |
| --- | --- | --- | --- |
| `media_admin` | **`events.manage`** | **No** | **No** |
| `registrar` | `events.manage` | `registrations.manage` | No by default |
| `finance_reviewer` | No | No | `payment_evidence.review` (E4) |

Do not collapse registration/payment access into Event content permission.

## Phase boundaries

| Phase | Scope |
| --- | --- |
| **E1** | Schema, public list/detail, media/branch, RLS read, focused tests |
| **E2** | Hub Events editor + `events.manage` write policies |
| **E3** | Public registration + private rows + Hub settings + minimal registrar view |
| **E4** | Private payment evidence review |
| **E5** | Camp migration **after** human confirms current event facts |
| **E6** | Hostname cutover / vanity redirects |

## Legacy Camp

Youth & Teens Camp 2025 “Level Up” remains historical source material only. Fee, bank, venue, and Aug 2025 dates must **not** be auto-published. See [`LEGACY_CAMP_MIGRATION.md`](LEGACY_CAMP_MIGRATION.md).

## Search

Events Search indexing is **deferred**. Registration rows must **never** appear in Search.

## Migrations

- E1: `platform/supabase/migrations/20260914180000_events_e1_public.sql`
- E2: `platform/supabase/migrations/20260914190000_events_e2_hub_writes.sql`
- E2.1 grants: `platform/supabase/migrations/20260914191000_events_e2_authenticated_grants.sql`
- E3: `platform/supabase/migrations/20260914192000_events_e3_registration.sql`
- Staging apply only after human review. **Not** applied to production by this phase.
