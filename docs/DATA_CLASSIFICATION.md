# KCMI Data Classification

**Status:** ACCEPTED retention defaults via [ADR-0004](DECISIONS/ADR-0004-sensitive-data-storage-retention.md); classification model ACCEPTED direction  
**Enforcement:** `.cursor/rules/20-data-privacy.mdc`, [ARCHITECTURE_V1_DRAFT.md](ARCHITECTURE_V1_DRAFT.md)

---

## Classification levels

| Level | Examples | Handling summary |
|-------|----------|------------------|
| **Public** | Published sermons metadata, public event landings, published branch addresses, public marketing images | Public storage OK after publish; still validate uploads |
| **Internal** | Draft programs, unpublished schedules, staff directories (non-pastoral) | Authenticated Hub; least privilege |
| **Sensitive — Pastoral** | Prayer/counselling/welfare narratives, pastoral notes, assignments, pastoral messages | Isolated tables; RLS; MFA/AAL2; never in URLs/logs/notify bodies |
| **Sensitive — Financial** | Payment evidence; giving account configuration changes | Private storage; dual-approval for public giving changes (ADR-0006); MFA/AAL2 |
| **Credentials / Secrets** | Service-role keys, SMTP/Resend secrets, signing secrets | Server-only; never in Git or browser |

## Workflow mapping (ACCEPTED boundaries)

| Domain | Entities (conceptual) | Classification |
|--------|----------------------|----------------|
| Engagement | `engagement_submissions` (first_timer, fellowship, service_team) | Internal / PII |
| Pastoral | `pastoral_requests`, `pastoral_assignments`, `pastoral_messages`, `pastoral_case_notes` | Sensitive — Pastoral |
| Events | `event_registrations`, `payment_evidence` | PII + Sensitive — Financial (evidence) |
| Content | programs, announcements, sermons, branches | Public when published; Internal when draft |
| Config | giving accounts, livestream settings | Internal; Financial when payment destinations |

**Why isolate pastoral data:** Limits blast radius; clarifies RLS; separate retention; AI exclusion; confidentiality. Super Admin does **not** imply pastoral read (ADR-0003).

## Retention defaults (ACCEPTED — ADR-0004)

Configurable centrally; change via approved migrations/configuration.

| Class | Initial default |
|-------|-----------------|
| First-timer / Fellowship / Service-Team | 12 months after last meaningful activity → delete or anonymize |
| Event registrations | 12 months after event → delete/anonymize unless separate valid consent/purpose |
| Payment receipt images | Delete 90 days after financial reconciliation/event close (whichever later), unless documented legal/accounting need; non-image metadata may be retained separately |
| Resolved pastoral requests | 12 months after resolution; Pastoral Admin may extend only with documented reason |
| Audit metadata | 24 months; never store pastoral narratives or receipt contents |
| Published content & revisions | Retain while operationally/historically useful |

Deletion jobs must be auditable and must not bypass authorized retention holds.

## Notification rule

WhatsApp/SMS/email subjects and alert bodies: reference number + minimal non-sensitive status only.

## Google Forms

Field-level schemas remain **EXTERNAL VERIFICATION REQUIRED** until inspected per workflow (ADR-0005). This does not block unrelated foundation/public-site work.
