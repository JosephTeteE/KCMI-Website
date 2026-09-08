# Content-Security-Policy spike (Phase B)

**Status:** Spike report — not an ADR  
**Date:** 2026-09-07  
**Trigger:** Phase B instruction — stop if strong CSP requires nonces/Proxy and materially changes rendering architecture.

## Goal

Enforce a CSP **without** broad `script-src 'unsafe-inline'`, while remaining compatible with current Next.js App Router (v16) and calm caching/SSR defaults.

## Approaches considered

### A. Static CSP in `next.config` headers (enforcing `script-src 'self'` only)

- **Pros:** Simple; no middleware/Proxy coupling.
- **Cons:** Next.js often emits inline bootstrap/hydration scripts and style injection. A strict `script-src 'self'` without nonces commonly breaks the app. Tailwind/Next style injection also pressures `style-src`.
- **Phase B choice:** Use **Report-Only** CSP for document routes (`Content-Security-Policy-Report-Only`) plus enforcing `frame-ancestors` on `/admin`. Avoid shipping a breaking enforcing script CSP.

### B. Nonce-based CSP via middleware (or Proxy)

- **Pros:** Aligns with current Next.js CSP guidance for nonces; can avoid `unsafe-inline` for scripts.
- **Cons:** Couples every HTML response to dynamic nonce generation; can force dynamic rendering and reduce static optimization for pages that could otherwise be static; requires careful propagation of nonces into `next/script` / framework hooks.
- **Recommendation:** Adopt in a **follow-up ADR** once Hub/public pages need enforcing CSP and Facebook/YouTube frame allowlists are known.

### C. Broad `unsafe-inline` for scripts

- **Pros:** Appears to “work.”
- **Cons:** Explicitly forbidden by Phase B / architecture rules as a silent compromise.
- **Decision:** Rejected.

### D. `proxy.ts` solely for CSP

- **Pros:** Newer Next surface for request interception.
- **Cons:** Not required for hostname routing (rewrites preferred, ADR-0002). Using Proxy only for CSP is habit-driven unless middleware is unavailable for nonce injection on this Next version.
- **Decision:** Do **not** introduce Proxy solely for CSP in Phase B.

## Security vs performance tradeoffs

| Approach | Security | Rendering / cache |
|----------|----------|-------------------|
| Report-Only (Phase B) | Visibility without breakages; not yet enforcing | Preserves default rendering |
| Nonce middleware (later) | Strong script control | More dynamic HTML; careful static segment use |
| `unsafe-inline` | Weak | Convenient, rejected |

## Recommendation

1. Phase B: keep **Report-Only** document CSP + strong Hub `frame-ancestors` / security headers (HSTS without preload, nosniff, referrer, permissions-policy).
2. Before public launch / embed features: ADR for **nonce-based enforcing CSP**, including Facebook + YouTube `frame-src` allowlists.
3. Do not add Proxy unless a concrete Next.js requirement blocks middleware nonces.

## Related

- `platform/src/lib/security/headers.ts`
- `platform/next.config.ts`
- ADR-0001 (HSTS no preload), ADR-0007 (Facebook frames later)
