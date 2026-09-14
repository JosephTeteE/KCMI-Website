# KCMI Search V2

**Status:** Implemented (public site search)  
**Stack:** Next.js App Router + Supabase/Postgres RPC (no Algolia/Meilisearch/vector SaaS)

## Scope

Visitors can search the **public** website for:

| Type | Sources | Canonical URL |
| --- | --- | --- |
| Page | Curated allowlist + published `website_documents` keys `about`, `services`, `faqs`, `sermons_page` | `/about`, `/services`, … |
| Program | `programs` with `status = published` | `/programs/[slug]` |
| Sermon | `sermons` with `status = published` | `/sermons#[id]` |
| Location | `church_branches` with `is_public` and `status = published` | `/locations/[slug]` |

Entry points: header Search control (desktop + mobile), mobile nav “Search”, results at `/search?q=…`.

## Public-only data boundary

Search filtering is **server-side / database-side** via `search_public_content` (`SECURITY DEFINER` with explicit publication predicates). Staff RLS that can read drafts must **not** widen search results.

Never searchable through this feature:

- Hub/admin routes, auth, QA fixtures  
- Draft / preview / archived programs or sermons  
- Privacy / Terms pages (not indexed)  
- Pastoral narratives, prayer/counselling/welfare case data  
- Private giving ops / receipts / audit logs / user profiles  
- Private media buckets  

Giving **public page** copy is searchable; bank account numbers are not added to the search corpus beyond what the public Giving page already displays as a destination.

## Ranking

Multi-word AND matching (case-insensitive, whitespace-normalized, query capped at 80 characters). Title/name matches score above body/description-only matches.

## SEO

`/search` and `/search?q=…` use `noindex, follow`. Destination pages keep their own metadata.

## Out of scope

- Giving Hub dual-approval (D2)  
- Pastoral workflows  
- Full Events/Camp registration  
- External search SaaS / AI vector search  
- QA infrastructure expansion / visual baseline updates  
