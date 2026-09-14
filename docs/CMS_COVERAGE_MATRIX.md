# KCMI CMS coverage matrix (D1.7)

**Date:** 2026-09-10  
**Supersedes:** D1.6B matrix entries for Homepage section naming, Spotlight takeover, and Locations finder behaviour.

**Principle:** Church staff manage routine public **content**. Engineering owns architecture, tokens, schema, RBAC, security, and structural navigation.

Roles: **HQ Content Admin** (`media_admin`) and **Super Admin**. Neither has pastoral narrative access. Giving destination edits remain Super Admin in RBAC and **not implemented** (D2).

Legend for **staff-changeable?**: would a nontechnical operator reasonably expect to change this without a code deploy?

---

## Hub information architecture (current)

- **Dashboard** — livestream / Spotlight / branch count + Hub-only “Needs attention”
- **Website Content → Homepage** — visual section editor (see the part → Words/Photo/Buttons → Current → Change → Preview → Make live):
  - Top of Homepage (words / photo / buttons)
  - KCMI Spotlight (featured program + optional visitor takeover)
  - Discover KCMI (words / photo)
  - Watch & Listen (words)
  - Find a Location section (words)
  - Prayer & Giving (words)
- **About KCMI** — lighter visual sections (Who We Are / Vision & Mission / Leadership / Portrait) with Words vs Photo choice
- **Services / FAQs / Global / Sermons page** — unchanged ownership
- **Programs / Sermons / Branches / Livestream / Media Library**
- **Events / Pastoral / Giving** — Hub nav disabled (not this phase)

`content_revisions` and `audit_events` remain engineering/audit — not staff website editors.

See also: [`PUBLIC_EXPERIENCE_V2.md`](PUBLIC_EXPERIENCE_V2.md) (includes Visual section editor constraint vs non-page-builder).

---

## Inventory (D1.7 surfaces)

| # | Route | Section | Field / item | Source now | Hub destination | Notes |
|---|---|---|---|---|---|---|
| 1 | `/` | Top of Homepage | Vision headline, kicker, supporting, CTAs, image | `website_documents.home` | Homepage → Top of Homepage | Vision default: Raising Kings To Build The Kingdom |
| 2 | `/` | Top of Homepage | Compact HQ times + Watch Live live state | HQ branch + `livestream_settings` | Branches / Livestream | Omit times when empty |
| 3 | `/` | KCMI Spotlight | Featured program | published featured `programs` | Homepage → KCMI Spotlight | **Hidden** when none |
| 4 | `/` | Spotlight takeover | enabled / frequency / promo URL / window | home `spotlightTakeover*` | KCMI Spotlight | Browser frequency cap; public only |
| 5 | `/` | Discover KCMI | pathways + image | home welcome/Discover + services offerings | Discover KCMI / Services | Cell, Teams, About |
| 6 | `/` | Watch & Listen | live / sermon / fallback | livestream + sermons + home fallback | Watch & Listen | Priority: live → sermon → invite |
| 7 | `/` | Find a Location | summary copy | home locations* + branch aggregate | Find a Location section | Not a branch dump |
| 8 | `/` | Prayer & Giving | copy + CTAs | home document | Prayer & Giving | Forms external; accounts D2 |
| 9 | `/locations` | Finder | search/filter compact cards | published branches | Branches | No address/phone dump on cards |
| 10 | `/locations/[slug]` | Branch page | facts + media | branch + `branch_media` | Branch editor | Omit missing optional fields |
| 11 | `/about` etc. | Existing CMS | website_documents / programs / sermons | prior D1.6 coverage | matching Hub editors | Unchanged ownership |

Remaining engineering-controlled: brand logo, structural nav, giving accounts (D2), legal documents, Events/Camp, pastoral, env canonical URL, security/layout. Search V2 is implemented for public corpus search (see [`SEARCH_V2.md`](SEARCH_V2.md)).

---

## Media placements used by the public frontend

| Public location | Data source | Hub editor | Crop preset | Rendered dynamically? |
|---|---|---|---|---|
| Homepage hero | `home.heroMediaId` or static `welcome-1920.webp` | Top of Homepage → Replace Image | hero 16:9 | yes when asset assigned |
| Discover KCMI image | `home.welcomeMediaId` or static `church-view.webp` | Discover KCMI → Replace Image | card 4:3 | yes when asset assigned |
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
| Events/Camp registration | E3 public registration IMPLEMENTED (no payment); E4 receipts; see [`EVENTS_V1.md`](EVENTS_V1.md); `camp-deploy` untouched |
| Search index | Search V2 — public published corpus only; see [`SEARCH_V2.md`](SEARCH_V2.md) |
| Pastoral narratives | Not in D1; media_admin must not receive them |
| `NEXT_PUBLIC_SITE_URL` / environment | Operations, not content |
| DFR WhatsApp “message Subscribe” | Intentionally removed from global UX |
| Heavy hero video autoplay | Performance debt; see PUBLIC_EXPERIENCE_V2 future constraints |

Do not invent placements or programs.
