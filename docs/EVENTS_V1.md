# Events V1 — public advertising + Hub editor

**Status:** Events V1 ends at **E2**.  
**Delivered:** E1 public Events pages + E2 Hub Events editor.  
**Deferred:** public registration, payments, receipts, Camp content migration, Search Event indexing, Giving, Pastoral.

## Product principle

KCMI Events V1 is an **event advertising / information** system.

- Events can be published **without** registration or payment.
- Not every Event requires registration.
- Not every Event is paid.
- Registration and payments are **optional future capabilities** and must be designed only when a real KCMI requirement exists.
- Paid Events should prefer a secure payment provider such as **Paystack** or another approved provider.
- Manual bank transfer + receipt upload was a **Youth Camp legacy** workflow and is **not** the default Events model.

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

**Not in current Events V1:** registration config, `event_registrations` product use, payment evidence, bank accounts, Turnstile for Events, Resend for Events, CSV export.

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
- Grants follow-up: `platform/supabase/migrations/20260914191000_events_e2_authenticated_grants.sql`
- INSERT/UPDATE: `has_permission('events.manage')` only.
- No DELETE policy — remove from website via `archived`.
- `media_admin` gains `events.manage` in DB + `DEFAULT_ROLE_PERMISSIONS`.
- `media_admin` still has **no** `registrations.manage` / `payment_evidence.review`.

## Public routes

- `/events` — Upcoming (chronological) + Past (newest first); calm empty state when none.
- `/events/[slug]` — Featured media or branded text layout; dates; venue/branch; summary/body; contact when set.
- **No** Register button, registration form, capacity messaging, or payment/receipt UI.
- Hostname rewrite unchanged: `events.kcmi-rcc.org/:path*` → `/events/:path*` (ADR-0002).

## Hub Events (E2)

Routes: `/admin/events`, `/admin/events/new`, `/admin/events/[id]`

Wizard steps: Details → When → Where → Photo → Contact → Review

| Flow | Behaviour |
| --- | --- |
| Create | Always `draft`; primary action **Save as a draft** |
| Draft edit | Change → Preview → **Save draft changes**; **Make this live** is separate |
| Published edit | Current → Change → Preview → **Make these changes live** (no silent auto-publish) |
| Photo | Upload new / choose existing; live only after Make Live on published rows |
| Archive | **Remove from public website** → `archived` with confirm; restore to draft |

### Slug policy

- Create / draft: slug from title; collisions get `-2`, `-3`, …
- **Published / archived:** slug is **stable** — title edits do not rewrite the public URL

### Audit / revisions

- `writeAuditEvent` on create, draft/live update, publish, archive, restore
- `saveRevision` with `entity_type='event'` on publish/archive/restore and live content updates
- Snapshots are content fields only (no registration/payment data)

## Permissions

| Role | Content | Registrations | Payment evidence |
| --- | --- | --- | --- |
| `media_admin` | **`events.manage`** | **No** | **No** |
| `registrar` | `events.manage` | `registrations.manage` (future ops only) | No by default |
| `finance_reviewer` | No | No | `payment_evidence.review` (future) |

Do not collapse future registration/payment access into Event content permission.

## Phase boundaries

| Phase | Scope | Status |
| --- | --- | --- |
| **E1** | Schema, public list/detail, media/branch, RLS read | **Delivered** |
| **E2** | Hub Events editor + `events.manage` write policies | **Delivered** |
| **Registration** | Optional future — redesign only with a real requirement | **Deferred** |
| **Payments / receipts** | Optional future — prefer secure provider; not manual-transfer default | **Deferred** |
| **Camp migration** | After human confirms current event facts | Deferred |
| **Hostname cutover** | Vanity redirects | Deferred |

## Legacy Camp

Youth & Teens Camp 2025 “Level Up” remains historical source material only. Fee, bank, venue, and Aug 2025 dates must **not** be auto-published. Legacy camp registration + receipt upload remain in the legacy Camp application and are **not** requirements for general Events V1. See [`LEGACY_CAMP_MIGRATION.md`](LEGACY_CAMP_MIGRATION.md).

When the next Youth Camp is prepared, **human** decides what that specific event needs.

## Search

Events Search indexing is **deferred**. Registration rows must never appear in Search.

## Turnstile / email for current Events

Current Events V1 has **no** public write submission, so Events does **not** require Turnstile or Resend. Platform-level Turnstile/Resend architecture for other future public writes may remain documented elsewhere.

## Migrations

- E1: `platform/supabase/migrations/20260914180000_events_e1_public.sql`
- E2: `platform/supabase/migrations/20260914190000_events_e2_hub_writes.sql`
- E2.1 grants: `platform/supabase/migrations/20260914191000_events_e2_authenticated_grants.sql`
- E3 registration (historical, deferred): `platform/supabase/migrations/20260914192000_events_e3_registration.sql` — **preserved**; do not delete
- Registration deferred cleanup: `platform/supabase/migrations/20260914213000_events_defer_registration_cleanup.sql` — removes E3-only registration objects so the final schema matches advertising-only Events V1

Final intended schema after the full chain: E1/E2 Events content only (no registration columns/table/RPCs).
