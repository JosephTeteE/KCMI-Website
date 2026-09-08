# ADR-0007: Livestream model (Facebook)

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

Earlier draft text incorrectly implied YouTube for livestream. **KCMI livestream uses Facebook.** Sermons may continue to use YouTube separately. Legacy admin accepted arbitrary embed HTML into the DB and rendered via `innerHTML` (**VERIFIED CURRENT STATE** anti-pattern).

## Decision

Livestream is a **simple Hub-managed setting**, not a separate subsystem.

Conceptual record `livestream_settings`:

- `facebook_url` (normalized, validated)
- `is_live` (manual toggle for V1)
- `updated_by`
- `updated_at`

Workflow:

1. Admin pastes Facebook Live/video URL, **or**
2. Admin pastes Facebook-provided embed HTML for convenience → **server-side parsing extracts** an allowed Facebook URL
3. Validate hostname/protocol against an **explicit Facebook allowlist**
4. Persist **only** the normalized/validated URL — **not** arbitrary embed HTML as authoritative content
5. Render through a controlled Facebook embed component/template

Do **not** use arbitrary `innerHTML` / `dangerouslySetInnerHTML` for user-provided embed code.

- No Graph API live-status detection in V1
- Only users with `livestream.manage` may change configuration
- Changes must be **audit logged**

YouTube remains for **sermons**, not livestream.

## Consequences

- CSP must allowlist Facebook embed origins intentionally (exact hosts confirmed at implementation — EXTERNAL VERIFICATION REQUIRED against current Facebook embed docs)
- Hub UI is a URL + toggle, not a freeform HTML textarea as source of truth

## Alternatives considered

- Store raw embed HTML — rejected as authoritative model
- YouTube livestream — incorrect for KCMI; rejected
- Graph API auto `is_live` — deferred (credentials/complexity)

## Security / privacy notes

- Prevents stored XSS via embed HTML
- Permission + audit on changes

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md) §14, §29
- ADR-0001 (sermons YouTube vs livestream Facebook)
