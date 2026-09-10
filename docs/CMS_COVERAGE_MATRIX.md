# KCMI CMS coverage matrix (D1.6B)

**Date:** 2026-09-08  
**Supersedes:** D1.6A matrix (same file). D1.6A remains the accepted gap analysis; this file records **after** coverage.

**Principle:** Church staff manage routine public **content**. Engineering owns architecture, tokens, schema, RBAC, security, and structural navigation.

Roles: **HQ Content Admin** (`media_admin`) and **Super Admin**. Neither has pastoral narrative access. Giving destination edits remain Super Admin in RBAC and **not implemented** (D2).

Legend for **staff-changeable?**: would a nontechnical operator reasonably expect to change this without a code deploy?

---

## Hub information architecture (current)

- **Dashboard** — counts and livestream state
- **Website Content**
  - Home (hero, welcome, prayer/giving CTA copy, featured-program picker, contextual images)
  - About KCMI (who we are, vision, mission, leadership preview + pastor biography fields)
  - Services (intro, cell, teams, media vs care blocks)
  - FAQs
  - Global / Contact / Social / Footer / DFR / livestream visitor copy
  - Sermons page copy / platforms
- **Programs** — `/admin/programs` (cover image + featured placement)
- **Sermons** — `/admin/sermons` (including optional home-featured sermon)
- **Branches** — `/admin/branches` (country, public facts, hero + gallery uploads)
- **Livestream** — `/admin/livestream` (Facebook URL + live flag; visitor copy also on Global)
- **Media Library** — reusable assets; contextual replace flows live on the relevant editor
- **Events / Pastoral / Giving** — Hub nav disabled (not this phase)

`content_revisions` and `audit_events` remain engineering/audit — not staff website editors.

---

## Inventory

| # | Route | Section | Field / item | Type | Source now | Staff-changeable? | Hub editable? | Hub destination | Role | Preview/publish | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` | Home hero | Headline | text | `website_documents.home` (seed fallback locally) | yes | yes | Website Content → Home | HQ Content Admin | save publishes | CMS |
| 2 | `/` | Home hero | Kicker | text | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS |
| 3 | `/` | Home hero | Supporting paragraph | text | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS |
| 4 | `/` | Home hero | Hero image | image | home `heroMediaId` or verified static fallback | yes | yes | Home → Hero → Replace Image | HQ Content Admin | with asset | CMS |
| 5 | `/` | Home hero | Plan a visit CTA | link | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS (path or https) |
| 6 | `/` | Home hero | Watch Live | link | home document (defaults to `/livestream`) | yes | yes | Home | HQ Content Admin | save publishes | CMS |
| 7 | `/` | Service times | HQ day/time rows | branch data | `church_branches` HQ | yes | yes | Branches → Headquarters | HQ Content Admin | immediate | CMS |
| 8 | `/` | Service times | Location label | text | HQ `cityLabel` | yes | yes | Headquarters branch | HQ Content Admin | immediate | CMS |
| 9 | `/` | Featured program | Empty state | — | **section hidden** when none published+featured | n/a | n/a | Programs | HQ Content Admin | publish + featured | CMS / no fake program |
| 10 | `/` | Featured program | Title, dates, copy, CTA | program | published featured `programs` | yes | yes | Programs | HQ Content Admin | draft/preview/publish | CMS |
| 11 | `/` | Featured program | Cover image | image | `featured_media` **rendered** | yes | yes | Program → Cover Image | HQ Content Admin | with program | CMS |
| 12 | `/` | Welcome | Heading | text | home document (vision default) | yes | yes | Home | HQ Content Admin | save publishes | CMS |
| 13 | `/` | Welcome | Body | text | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS |
| 14 | `/` | Welcome | Photo | image | home `welcomeMediaId` or static fallback | yes | yes | Home → Welcome → Replace Image | HQ Content Admin | with asset | CMS |
| 15 | `/` | Sermon highlight | Title/description/CTAs | sermon or home fallback | featured published sermon, else home fallback copy | yes | yes | Sermons + Home fallback | HQ Content Admin | published sermons | CMS |
| 16 | `/` | Sermon highlight | YouTube URL/label | link | sermon or sermons page / global | yes | yes | Sermons / Global | HQ Content Admin | published | CMS |
| 17 | `/` | Locations preview | Cards | branch | published branches; **link to** `/locations/[slug]` | yes | yes | Branches | HQ Content Admin | immediate | CMS |
| 18 | `/` | Prayer CTA | Copy + Google Form | text + link | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS; form remains external |
| 19 | `/` | Giving CTA | Copy + `/giving` | text + link | home document | yes | yes | Home | HQ Content Admin | save publishes | CMS copy; **accounts are D2** |
| 20 | `/` | JSON-LD | Organization | global | identity + social from global document | yes | yes | Global | HQ Content Admin | save publishes | CMS |
| 21 | `/about` | Church page | Who we are / vision / mission / leadership preview | text | `website_documents.about` | yes | yes | Website Content → About KCMI | HQ Content Admin | save publishes | CMS |
| 22 | `/about/apostle-frank-aikins` | Biography | Name, role, portrait, bio | text + image | about document | yes | yes | About KCMI | HQ Content Admin | save publishes | CMS |
| 23 | `/about#mission` | Vision | Vision string | text | about document | yes | yes | About | HQ Content Admin | save publishes | CMS |
| 24 | `/mission` | — | redirect | — | permanent redirect → `/about#mission` | n/a | n/a | — | — | — | Engineering (URL compatibility) |
| 25 | `/locations` | Country groups | Country | branch | `church_branches.country` | yes | yes | Branch form Country | HQ Content Admin | immediate | CMS |
| 26 | `/locations` | Branch card | Public facts | branch | Supabase | yes | yes | `/admin/branches/[id]` | HQ Content Admin | immediate | CMS |
| 27 | `/locations/[slug]` | Hero / gallery | branch media | image | published `branch_media` | yes | yes | Branch → Hero / Gallery | HQ Content Admin | published attachment | CMS |
| 28 | `/services` | Intro | Page intro | text | `website_documents.services` | yes | yes | Website Content → Services | HQ Content Admin | save publishes | CMS |
| 29 | `/services` | HQ worship times | times | branch | Headquarters | yes | yes | Headquarters | HQ Content Admin | immediate | CMS |
| 30 | `/services` | Cell / teams / media / care | copy + existing Google Form URLs | text + link | services document | yes | yes | Services | HQ Content Admin | save publishes | CMS; forms remain external |
| 31 | `/sermons` | Header copy | headline/sub | text | `website_documents.sermons_page` | yes | yes | Website Content → Sermons page | HQ Content Admin | save publishes | CMS |
| 32 | `/sermons` | Recent messages | cards | sermon | published sermons; empty state if none | yes | yes | `/admin/sermons` | HQ Content Admin | draft/preview/publish | CMS |
| 33 | `/sermons` | Platforms | YouTube, Silverbird (no unverified time), TikTok labelled as Apostle Frank | text + link | sermons_page document | yes | yes | Sermons page | HQ Content Admin | save publishes | CMS |
| 34 | `/contact` | Intro copy | text | contact page + global | yes | yes | Global | HQ Content Admin | save publishes | CMS |
| 35 | `/contact` | Email / phone | global | `contact@kcmi-rcc.org` + HQ phone | yes | yes | Global | HQ Content Admin | save publishes | CMS |
| 36 | `/contact` | DFR Subscribe hint | — | **removed** from public contact | n/a | n/a | — | — | — | Engineering-controlled removal (DFR WhatsApp subscribe not in global UX) |
| 37 | `/contact` | Social | link + label | global social rows | yes | yes | Global | HQ Content Admin | save publishes | CMS; allowlisted domains |
| 38 | `/giving` | Accounts | text | seed `giving.ts` | yes | **no this phase** | — | Super Admin later | n/a | **Engineering / D2** |
| 39 | `/livestream` | Heading, messages, live | text + URL | global copy + `livestream_settings` | yes | yes | Livestream + Global | HQ Content Admin | immediate | CMS |
| 40 | `/faqs` | Q&A | text + links | `website_documents.faqs` | yes | yes | Website Content → FAQs | HQ Content Admin | save publishes | CMS |
| 41 | `/privacy` | Policy body | text | factual V2 draft seed | counsel | no | — | — | — | **Engineering / counsel** — PRE-PRODUCTION REVIEW |
| 42 | `/terms` | Terms body | text | legacy Terms, not rewritten | counsel | no | — | — | — | **Engineering / counsel** |
| 43 | `/events` | Index | empty state | site shell + metadata | n/a | no | Hub Events disabled | — | — | **Engineering** until Events phase |
| 44 | `/events/[slug]` | Unknown slug | 404 | `notFound` | n/a | no | — | — | — | **Engineering** until Events CMS |
| 45 | global | Header logo | image | `/brand/kcmi-logo.webp` | rare | no | — | — | — | **Engineering / brand** |
| 46 | global | Header nav | structural | seed `primaryNav` | rare | no | — | — | — | **Engineering** |
| 47 | global | Header Watch Live | link | seed `headerCta` | maybe | no | — | — | — | **Engineering** (home can still edit in-hero Live CTA) |
| 48 | global | Footer explore | structural | seed `footerNav` | rare | no | — | — | — | **Engineering** |
| 49 | global | Footer identity strings | text | church identity + vision | yes | partial | Global / identity remains legal names in seed | HQ Content Admin | save publishes | Legal names **engineering-controlled**; DFR/social CMS |
| 50 | global | Daily Faith Recharge | text + Spotify | global document | yes | yes | Global | HQ Content Admin | save publishes | CMS |
| 51 | global | Social destinations | link | global document | yes | yes | Global | HQ Content Admin | save publishes | CMS |
| 52 | global | Legal nav | structural | Privacy · Terms | rare | no | — | — | — | **Engineering** |
| 53 | global | Site URL / canonical | env | `NEXT_PUBLIC_SITE_URL` | no (ops) | no | — | — | — | **Engineering / ops** |
| 54 | `/admin/*` | Hub chrome | Sign out, nav | code | n/a | n/a | — | — | — | **Engineering** |

**D1.6A:** 12 Hub-manageable / majority seed.  
**D1.6B:** Routine public copy and media loops above are CMS or explicitly engineering-controlled. Remaining engineering-controlled: brand logo, structural nav, giving accounts (D2), legal documents, Events/Camp platform, Search, pastoral, env canonical URL, security/layout.

---

## Media placements used by the public frontend

| Public location | Data source | Hub editor | Crop preset | Rendered dynamically? |
|---|---|---|---|---|
| Homepage hero | `home.heroMediaId` or static `welcome-1920.webp` | Home → Replace Image | hero 16:9 | yes when asset assigned |
| Homepage welcome | `home.welcomeMediaId` or static `church-view.webp` | Home → Replace Image | card 4:3 | yes when asset assigned |
| About / pastor portrait | about document media or static `apostle-aikins.webp` | About → Replace portrait | square | yes when asset assigned |
| Logo | `/brand/kcmi-logo.webp` | none | — | no (brand) |
| Featured program cover | `programs.featured_media` | Program → Cover Image | card 4:3 | **yes** |
| Sermon thumbnail | `sermons.thumbnail` | Sermon form | card | yes if present |
| Branch hero | `branch_media` `hero` | Branch → Hero Image | hero 16:9 | **yes** on `/locations/[slug]` |
| Branch gallery | `branch_media` `gallery` | Branch → Gallery | original | **yes** on `/locations/[slug]` |
| Livestream | Facebook URL | Livestream | n/a | yes (link + live flag) |

---

## Engineering-controlled (justification)

| Item | Why not Hub-editable |
| --- | --- |
| Brand primitives / logo / layout / CSP / RBAC | Security and design-system integrity |
| Primary/footer information architecture | IA changes are releases, not copy edits |
| Giving account numbers | Dual-approval / D2; not this phase |
| Privacy / Terms body | Counsel; AI must not invent legal duties |
| Events/Camp registration | Separate approved phase; `camp-deploy` untouched |
| Search index | Next phase; public published content only |
| Pastoral narratives | Not in D1; media_admin must not receive them |
| `NEXT_PUBLIC_SITE_URL` / environment | Operations, not content |
| DFR WhatsApp “message Subscribe” | Intentionally removed from global UX |

Do not invent placements or programs. Target UX: **Home → Hero → Replace Image**; **Branch → Accra → Hero / Gallery**; **Program → Cover Image**.
