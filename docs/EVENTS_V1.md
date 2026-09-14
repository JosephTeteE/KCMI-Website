# Events V1 — E1 public + E2 Hub editor

**Status:** E1 public experience + E2 Hub Events editor  
**Does not authorize:** registration (E3), payment evidence (E4), Camp content migration (E5), Search Event indexing, Giving, Pastoral.

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

**Not in E1:** `event_registrations`, `payment_evidence`, registration config, bank accounts, Turnstile, Resend, CSV export.

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

## Public routes

- `/events` — Upcoming (chronological) + Past (newest first); calm empty state when none.
- `/events/[slug]` — Featured media or branded text layout; dates; venue/branch; summary/body; contact when set.
- **No** Register / payment / receipt UI until E3/E4.
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

## Permissions (E2)

| Role | Content | Registrations | Payment evidence |
| --- | --- | --- | --- |
| `media_admin` | **`events.manage`** | **No** | **No** |
| `registrar` | `events.manage` | `registrations.manage` (E3 ops) | No by default |
| `finance_reviewer` | No | No | `payment_evidence.review` (E4) |

Do not collapse registration/payment access into Event content permission.

## Phase boundaries

| Phase | Scope |
| --- | --- |
| **E1** | Schema, public list/detail, media/branch, RLS read, focused tests |
| **E2** | Hub Events editor + `events.manage` write policies |
| **E3** | Registration (no public receipt URLs) |
| **E4** | Private payment evidence review |
| **E5** | Camp migration **after** human confirms current event facts |
| **E6** | Hostname cutover / vanity redirects |

## Legacy Camp

Youth & Teens Camp 2025 “Level Up” remains historical source material only. Fee, bank, venue, and Aug 2025 dates must **not** be auto-published. See [`LEGACY_CAMP_MIGRATION.md`](LEGACY_CAMP_MIGRATION.md).

## Search

Events Search indexing is **deferred** until published Events content exists (likely E5 / pre-launch).

## Migrations

- E1: `platform/supabase/migrations/20260914180000_events_e1_public.sql`
- E2: `platform/supabase/migrations/20260914190000_events_e2_hub_writes.sql`
- Staging apply only after human review. **Not** applied to production by this phase.
