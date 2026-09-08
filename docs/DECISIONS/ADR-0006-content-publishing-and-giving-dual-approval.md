# ADR-0006: Content publishing and high-impact financial configuration

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

Non-technical staff need Hub publishing for programs/media, while legal and financial public data need stronger controls.

## Decision

### Content publishing

- Prefer structured fields and Draft → Preview → Publish → Archive for Hub-managed publishable content
- Version history/rollback for important editable content remains part of the architecture
- **Privacy Policy and Terms body content remain code-controlled for V1** (not routine Media Admin editable). A later ADR may change this.

### Giving / payment destination configuration

- Changes to **public giving bank-account / payment destination** information require **maker-checker / dual approval** before publication
- Both actors must have appropriate permission and **AAL2**
- Routine **event payment evidence verification** does **not** require dual approval unless later policy requires it

## Consequences

- Hub giving UI needs pending/approved states and two distinct approvers
- Legal pages ship via code review/deploy in V1

## Alternatives considered

- Hub-editable Privacy/Terms in V1 — deferred
- Dual approval for every payment-evidence review — rejected for V1

## Security / privacy notes

- Giving config changes are high-impact; audit log required
- Aligns with MFA AAL2 for financial configuration (ADR-0003)

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md) §6, Appendix C
- ADR-0003
