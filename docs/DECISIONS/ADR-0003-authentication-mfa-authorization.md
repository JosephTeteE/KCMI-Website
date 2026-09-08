# ADR-0003: Authentication, MFA, and authorization

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

**VERIFIED CURRENT STATE:** Legacy admin used env username/password and short-lived JWT without protecting livestream POST; UI obscurity is not security.

## Decision

### Authentication

- Supabase Auth is the V1 identity provider
- No custom password storage
- **TOTP MFA required for ALL KCMI Hub staff**
- Hub users must complete MFA enrollment during onboarding before routine administrative access is considered complete
- Sensitive/high-impact actions require an **AAL2** session
- Do not depend on experimental passkeys for V1

### Authorization

- Stable organizational roles + fine-grained permissions (not `pastor_prayer`-style role explosion)
- **Super Admin** means platform administration, **not** automatic unrestricted pastoral narrative access
- Pastoral narrative access requires **explicit pastoral permission** even for a technical Super Admin
- Media roles have **no** pastoral narrative access
- Pastors receive access by **explicit permission + case assignment**
- Enforce via database/server authorization and **RLS**; UI visibility is not a security boundary
- JWT/custom claims may assist UX; DB/RLS remain authoritative for rapidly revocable sensitive permissions
- Controlled “break-glass” pastoral access may be designed later with strong auditing; **not in V1** unless separately approved

## Consequences

- Phase B must include MFA enrollment, AAL2 gates, role_permissions, and RLS deny tests for media vs pastoral
- Super Admin onboarding must still grant pastoral permissions explicitly when needed

## Alternatives considered

- MFA only for high-sensitivity roles — rejected; MFA for all Hub staff accepted
- Super Admin implies full pastoral read — rejected
- Passkeys as V1 MFA — rejected for V1 dependency

## Security / privacy notes

- Aligns with ASVS Level 2 authentication/session expectations for staff apps
- Disabled accounts and session revocation must be enforceable

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md) §3, §9, §10
- ADR-0004 (pastoral data isolation)
