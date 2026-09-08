# KCMI Migration Plan

**Status:** Aligned to ACCEPTED ADRs (2026-09-07)  
**Depends on:** [PHASE_0_INVENTORY.md](../PHASE_0_INVENTORY.md), [ARCHITECTURE_V1_DRAFT.md](ARCHITECTURE_V1_DRAFT.md), `docs/DECISIONS/ADR-0001`–`ADR-0008`

---

## Principles

1. Legacy production remains available as reference and, until cutover, as the live site (**VERIFIED CURRENT STATE** hosting split: Vercel static + Render API + camp submodule — inventory).
2. Do not destructively refactor legacy application source as part of the rebuild foundation.
3. Google Forms schemas remain EXTERNAL VERIFICATION REQUIRED **per workflow** and do **not** block unrelated Phase B/C foundation/public-site work (**ACCEPTED** ADR-0005).
4. Cut over by capability, with DNS/rollback plans.
5. `camp.kcmi-rcc.org` is preserved as a vanity/legacy hostname redirecting to the applicable camp event on `events.kcmi-rcc.org` (**ACCEPTED** ADR-0002).

## Phases

| Phase | Focus | Exit criteria |
|-------|-------|---------------|
| **A — Governance** | Rules + docs + ADRs | ACCEPTED ADRs 0001–0008 recorded |
| **B — Platform foundation** | App init when **explicitly authorized**; Supabase; MFA; RLS; headers; Turnstile; CI | AuthZ/RLS tests; Hub MFA enrollment |
| **C — Public site** | Pages, performance budgets, SEO/redirects | CWV budgets; URL parity checklist |
| **D — Hub content** | Programs, media, sermons, branches, Facebook livestream | Staff publish without code |
| **E — Engagement + pastoral** | First-party forms; pastoral isolation | Per-workflow schema verification; deny tests |
| **F — Events** | `events.kcmi-rcc.org` + registrations + private image evidence + camp vanity redirect | Camp workflow without disposable repo |
| **G — Cutover** | DNS, decommission Render/camp disposable path | Rollback tested; ownership register complete |

## Coexistence

- Keep legacy URLs working via redirects where paths change.
- Redirect `camp.kcmi-rcc.org` → applicable `events.kcmi-rcc.org/[camp-slug]` (ADR-0002). Exact camp slug at cutover: product detail within ACCEPTED hostname policy.
- Do not delete “orphan” media until stakeholders confirm (**Phase 0 certification gap**).

## Data migration notes

| Source | Approach | Label |
|--------|----------|-------|
| Google Forms historical responses | Purpose-limited: active/open as needed; other history only after review | ACCEPTED direction (ADR-0005); schemas EXTERNAL VERIFICATION REQUIRED |
| Camp Sheet rows + Cloudinary URLs | Import metadata; **re-home** evidence to private storage; new uploads JPEG/PNG/WebP only | ACCEPTED (ADR-0004) |
| MySQL livestream row | Migrate to `livestream_settings.facebook_url` + `is_live` (normalize URL; do not keep raw HTML as source of truth) | ACCEPTED (ADR-0007) |
| Promo Sheet | Replace with Hub programs/announcements | ACCEPTED direction |

## Rollback (summary)

- DNS back to legacy Vercel targets.
- Keep legacy Render API available until events/Hub mail paths proven.
- Prefer forward-fix migrations in the new stack.

Detail: see Architecture §25.
