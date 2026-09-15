# KCMI Data Classification

**Status:** ACCEPTED retention defaults via [ADR-0004](DECISIONS/ADR-0004-sensitive-data-storage-retention.md); Care P1 provisional retention documented in [CARE_P1_FOUNDATION.md](CARE_P1_FOUNDATION.md)  
**Enforcement:** `.cursor/rules/20-data-privacy.mdc`, [ARCHITECTURE_V1.md](ARCHITECTURE_V1.md)

---

## Classification levels

| Level | Examples | Handling summary |
|-------|----------|------------------|
| **Public** | Published sermons metadata, public event landings, published branch addresses, public marketing images | Public storage OK after publish; still validate uploads |
| **Internal** | Draft programs, unpublished schedules, staff profiles (non-pastoral), Care status/assignment/timestamps | Authenticated Hub; least privilege |
| **Personal** | Care visitor name/email/phone when supplied | Hub Care only; least privilege; not in Search/AI |
| **HIGHLY_SENSITIVE — Care** | Prayer / pastoral / welfare **narratives**, pastoral case notes | Isolated `pastoral_*` tables; RLS; MFA/AAL2 for reads; never in URLs/logs/notify bodies/Search/AI/export |
| **Sensitive — Pastoral** (legacy label) | Same Care narratives/notes/assignments | Prefer **HIGHLY_SENSITIVE — Care** for new docs; ADR-0004 isolation still applies |
| **Sensitive — Financial** | Payment evidence; giving account configuration changes | Private storage; dual-approval for public giving changes (ADR-0006); MFA/AAL2 |
| **Credentials / Secrets** | Service-role keys, SMTP/Resend secrets, signing secrets | Server-only; never in Git or browser |

## Workflow mapping (ACCEPTED boundaries)

| Domain | Entities (conceptual) | Classification |
|--------|----------------------|----------------|
| Engagement | `engagement_submissions` (first_timer, fellowship, service_team) | Internal / PII |
| Care (Prayer / Pastoral / Welfare) | `pastoral_requests`, `pastoral_case_notes` | HIGHLY_SENSITIVE — Care |
| Events | `event_registrations`, `payment_evidence` | PII + Sensitive — Financial (evidence) |
| Content | programs, announcements, sermons, branches | Public when published; Internal when draft |
| Config | giving accounts, livestream settings | Internal; Financial when payment destinations |

**Why isolate Care data:** Limits blast radius; clarifies RLS; separate retention; AI exclusion; confidentiality. Super Admin does **not** imply Care narrative read (ADR-0003). Media Admin has **no** Care access.

Care P3 adds gated first-party Pastoral Care (`/pastoral-care`) and Welfare (`/welfare`) intake. Google Forms remain live visitor CTAs until an approved cutover. See [CARE_P3_PASTORAL_WELFARE.md](CARE_P3_PASTORAL_WELFARE.md).

## Retention defaults

Configurable centrally; change via approved migrations/configuration. Deletion jobs are **not** implemented in Care P1.

| Class | Initial default |
|-------|-----------------|
| First-timer / Fellowship / Service-Team | 12 months after last meaningful activity → delete or anonymize |
| Event registrations | 12 months after event → delete/anonymize unless separate valid consent/purpose |
| Payment receipt images | Delete 90 days after financial reconciliation/event close (whichever later), unless documented legal/accounting need; non-image metadata may be retained separately |
| **Prayer requests (closed)** | **6 months after closure** (HUMAN-approved provisional Care P1) |
| **Pastoral Care / Welfare requests (closed)** | **12 months after closure** (HUMAN-approved provisional Care P1; aligns with ADR-0004 pastoral baseline) |
| Staff case notes | Same retention as parent request |
| Audit metadata | 24 months; never store pastoral narratives or receipt contents |
| Published content & revisions | Retain while operationally/historically useful |

Deletion jobs must be auditable and must not bypass authorized retention holds.

## Care P1 controls (foundation)

- AAL2 required for Care queue and narrative/note reads (not mutations only)
- No public SELECT; no bulk narrative export; no visitor attachments in V1
- No AI access to narratives; not indexed in public Search / sitemap
- Google Forms remain current visitor intake until later phases
- See [CARE_P1_FOUNDATION.md](CARE_P1_FOUNDATION.md)

## Notification rule

WhatsApp/SMS/email subjects and alert bodies: reference number + minimal non-sensitive status only.

## Google Forms

Field-level schemas remain **EXTERNAL VERIFICATION REQUIRED** until inspected per workflow (ADR-0005). Forms remain live visitor intake during Care P1 (Hub foundation only).
