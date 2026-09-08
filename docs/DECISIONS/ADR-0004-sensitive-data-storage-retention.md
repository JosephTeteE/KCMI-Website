# ADR-0004: Sensitive data, storage, and retention

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

Legacy camp payment receipts used Cloudinary with permanent public URLs (**VERIFIED CURRENT STATE**). Pastoral and engagement data must not share a single unbounded JSON submissions bucket.

## Decision

### Data boundaries

Prefer clear sensitivity boundaries:

- `engagement_submissions` — first_timer, fellowship, service_team
- `pastoral_requests` — prayer, counselling, welfare (+ assignments, messages, case notes)
- `event_registrations` + `payment_evidence`
- Content/program entities remain separate

### Storage

- Supabase Storage for V1
- **Public bucket:** approved published marketing/media only
- **Private bucket:** payment evidence and other approved sensitive files
- No Cloudflare R2 in V1 (see ADR-0001)

### Payment evidence (V1)

- Images only: JPEG, PNG, WebP
- Max size: **5 MB**
- **No PDF** in V1
- Server-side size validation, MIME allowlist, file-signature/image validation where practical
- Randomized/non-user-controlled object names
- Private storage; authorization-controlled short-lived access
- No permanent public receipt URLs
- No separate malware-scanning vendor required for V1 under this constrained model

### Retention (configurable baseline)

Implement retention so periods are centrally configured and changed via approved migrations/configuration.

| Class | Initial default |
|-------|-----------------|
| First-timer / Fellowship / Service-Team | 12 months after last meaningful activity → delete or anonymize |
| Event registrations | 12 months after event → delete/anonymize unless separate valid consent/purpose |
| Payment receipt images | Delete **90 days** after financial reconciliation/event close (whichever later), unless documented legal/accounting need; non-image verification metadata may be retained separately |
| Resolved pastoral requests | 12 months after resolution; Pastoral Admin may extend only with documented reason |
| Audit metadata | 24 months default; **never** store pastoral narratives or receipt contents in audit payloads |
| Published content & revisions | Retain while operationally/historically useful |

Deletion jobs must be auditable and must not bypass authorized retention holds.

## Consequences

- Schema and jobs must encode retention holds and audit of deletes
- Payment evidence pipeline differs from legacy Cloudinary public URLs

## Alternatives considered

- PDF receipts in V1 — rejected
- Generic single `submissions` table for all workflows — rejected
- Mandatory third-party malware scanner in V1 — not required under image-only constraints

## Security / privacy notes

- Media staff must not access pastoral narratives
- Notifications must not include sensitive narratives

## References

- [DATA_CLASSIFICATION.md](../DATA_CLASSIFICATION.md)
- ADR-0003 (authorization)
