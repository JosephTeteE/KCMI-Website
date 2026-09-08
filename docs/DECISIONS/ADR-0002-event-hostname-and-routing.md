# ADR-0002: Event hostname and routing

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

**VERIFIED CURRENT STATE:** Camp lives in `camp-deploy` submodule at `camp.kcmi-rcc.org` with disposable camp-specific architecture. Legacy redirects send `/youth-camp.html` paths to that host.

## Decision

- Canonical event platform hostname: **`events.kcmi-rcc.org`**
- Each reusable event has a stable slug, e.g. `events.kcmi-rcc.org/camp-2027`, `events.kcmi-rcc.org/ministers-conference-2027`
- Events root may display or redirect to the current featured event
- Preserve **`camp.kcmi-rcc.org`** as a legacy/vanity hostname and **redirect** it to the applicable camp event (do not break old links)
- Prefer current Next.js **hostname-based `next.config` rewrites** with `has: [{ type: "host", ... }]` mapping events host paths to real routes under `/events/...`
- Route groups organize layouts only; they are not URL segments or rewrite destinations
- Do **not** use `proxy.ts` unless implementation testing shows rewrites cannot satisfy a concrete requirement (document gap + new ADR if so)

## Consequences

- Single deployable Next.js app can serve apex/www and events host via config rewrites.
- Camp vanity redirects must be maintained in DNS/app redirect map during cutover.

## Alternatives considered

- Keep building per-camp repositories — rejected.
- Retire `camp.kcmi-rcc.org` without redirect — rejected (breaks bookmarks/links).
- Middleware/Proxy-first hostname routing — rejected as default; rewrites preferred.

## Security / privacy notes

- Host-based routing is not an authorization boundary; event registration and payment evidence still use server/RLS controls.

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md) §13
- Legacy `vercel.json` camp redirects (VERIFIED CURRENT STATE)
