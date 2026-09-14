# Events V1 — E1 implemented model

**Status:** E1 implementation (schema + public experience)  
**Does not authorize:** Hub Events editor (E2), registration (E3), payment evidence (E4), Camp content migration (E5), Search Event indexing, Giving, Pastoral.

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

## RLS (E1)

- `anon` / public: **SELECT** where `status = 'published'` only.
- `authenticated`: published **or** `hub.access` (staff may read drafts later in Hub).
- **No** INSERT/UPDATE/DELETE policies in E1.
- E2 will add writes gated by `events.manage`.
- Service-role remains server-only.

## Public routes

- `/events` — Upcoming (chronological) + Past (newest first); calm empty state when none.
- `/events/[slug]` — Featured media or branded text layout; dates; venue/branch; summary/body; contact when set.
- **No** Register / payment / receipt UI until E3/E4.
- Hostname rewrite unchanged: `events.kcmi-rcc.org/:path*` → `/events/:path*` (ADR-0002). Do not configure `camp.kcmi-rcc.org` in E1.

## E2 permission intent (document only — Hub UI later)

| Role | Content | Registrations | Payment evidence |
| --- | --- | --- | --- |
| `media_admin` | **Grant** `events.manage` in E2 | **No** `registrations.manage` | **No** `payment_evidence.review` |
| `registrar` | `events.manage` where needed | `registrations.manage` in E3 | No by default |
| `finance_reviewer` | No events content required | No | `payment_evidence.review` in E4 |

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

Events Search indexing is **deferred** until published Events content exists (likely E5 / pre-launch). Do not reopen Search V2 in E1.

## Migration

- Forward-only: `platform/supabase/migrations/20260914180000_events_e1_public.sql`
- Staging apply only after human review. **Not** applied to production by this phase.
