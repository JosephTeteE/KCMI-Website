# ADR-0008: AI trust boundary (V1)

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

Future AI assistance for Hub drafting is desirable but must not bypass authorization or expose pastoral data.

## Decision

V1 AI scope is **draft-assist only**.

AI may help draft public administrative content if introduced. AI:

- cannot publish by itself,
- cannot replace authorization,
- has no pastoral narrative access by default,
- receives no unrestricted production credentials,
- has no database superuser capability,
- produces **untrusted** output that must be validated,
- requires human approval for meaningful actions,
- assisted actions must be attributable in audit logs.

Any expansion beyond draft assistance requires a **new security review and ADR**.

Architecture should allow future AI features without granting AI direct database superuser privileges.

## Consequences

- Product features that auto-publish or read pastoral queues via AI are out of V1 scope
- Audit model should reserve fields for AI tool metadata + human approver

## Alternatives considered

- AI with pastoral inbox summarization in V1 — rejected without separate review
- AI service-role access — rejected

## Security / privacy notes

- Treat AI output as untrusted input (injection / incorrect content)
- Aligns with ASVS-minded trust boundaries and data classification

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md) Appendix B
- `.cursor/rules/10-security.mdc`
