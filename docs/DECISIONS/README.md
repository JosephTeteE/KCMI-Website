# Architecture Decision Records (ADRs)

## Purpose

ADRs capture **accepted** architectural choices for the KCMI Digital Platform.  
[`ARCHITECTURE_V1_DRAFT.md`](../ARCHITECTURE_V1_DRAFT.md) tracks the integrated picture; **ACCEPTED ADRs** are the decision authority for V1.

## States

| State | Meaning |
|-------|---------|
| DRAFT | Proposal under discussion |
| ACCEPTED | Approved; may be implemented when build work is explicitly authorized |
| SUPERSEDED | Replaced by a later ADR |
| REJECTED | Explicitly not chosen |

## Accepted ADRs (V1)

| ID | Title | Status |
|----|-------|--------|
| [ADR-0001](ADR-0001-target-stack-and-hosting.md) | Target stack and hosting | ACCEPTED |
| [ADR-0002](ADR-0002-event-hostname-and-routing.md) | Event hostname and routing | ACCEPTED |
| [ADR-0003](ADR-0003-authentication-mfa-authorization.md) | Authentication, MFA, and authorization | ACCEPTED |
| [ADR-0004](ADR-0004-sensitive-data-storage-retention.md) | Sensitive data, storage, and retention | ACCEPTED |
| [ADR-0005](ADR-0005-public-forms-bot-protection.md) | Public forms and bot protection | ACCEPTED |
| [ADR-0006](ADR-0006-content-publishing-and-giving-dual-approval.md) | Content publishing and giving dual approval | ACCEPTED |
| [ADR-0007](ADR-0007-livestream-facebook-model.md) | Livestream model (Facebook) | ACCEPTED |
| [ADR-0008](ADR-0008-ai-trust-boundary.md) | AI trust boundary (V1) | ACCEPTED |

## Process

1. Copy [ADR-0000-template.md](ADR-0000-template.md) to `ADR-NNNN-short-title.md`.
2. Mark status DRAFT; list open verification items.
3. Obtain human approval from designated platform owners.
4. Set status ACCEPTED before implementation that depends on the decision.
5. Do not store secrets in ADRs.

## Rules

- Do not implement work that depends on DRAFT ADRs.
- Explicit production deploy / DNS / credential changes still require separate human instruction.
- Prefer linking to Phase 0 inventory for verified legacy facts.
