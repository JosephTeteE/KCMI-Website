# Care P3 — Pastoral Care + Welfare first-party intake

**Status:** Implemented in platform (intake **disabled by default** until HUMAN cutover)  
**Depends on:** Care P1 foundation, Care P2 Prayer pattern

## Public routes

| Route | Gate | Default |
|-------|------|---------|
| `/pastoral-care` | `KCMI_PASTORAL_INTAKE_ENABLED=1` | OFF |
| `/welfare` | `KCMI_WELFARE_INTAKE_ENABLED=1` | OFF |

When OFF: submit fails closed; page calmly links the existing Google Form.  
**P3 does not replace Services/homepage CTAs.**

## Pastoral Care field mapping

| Public field | Required | Storage |
|--------------|----------|---------|
| Name | yes | `display_name` |
| Phone | yes | `phone` |
| Email | optional | `email` |
| Reason for requesting Pastoral Care | yes | part of `narrative` |
| Preferred way to speak (In person / By phone) | yes | `preferred_contact_method` (`in_person` \| `phone`) |
| Preferred time | yes | `preferred_contact_timing` |
| Additional information | optional | appended into the same `narrative` under a clear separator |

`service_type = pastoral`, `status = new`, `contact_requested = true`.  
Internal permissions remain `counselling.*`. Assignment isolation unchanged (assigned_to = self unless `counselling.assign`).

## Welfare field / category mapping

| Public field | Required | Storage |
|--------------|----------|---------|
| Name | yes | `display_name` |
| Phone | yes | `phone` |
| Email | optional | `email` |
| Type of request | yes | `request_category` |
| Description of need | yes | part of `narrative` |
| Additional information | optional | appended into the same `narrative` |

**Category approach:** one nullable column `request_category` on `pastoral_requests`, constrained to Welfare allowlist (`financial`, `food`, `clothing`, `shelter`, `medical`, `other`). Null for prayer/pastoral. Enables Hub filtering without encoding category inside opaque narrative text. “Medical” is a support category only — not medical intake.

`service_type = welfare`, shared `welfare.read` queue (assignment optional).

## Schema / migration

`platform/supabase/migrations/20260917120000_care_p3_pastoral_welfare_intake.sql`

- Adds enum value `care_contact_method.in_person`
- Adds `request_category` + check + welfare index

## Google Forms (unchanged live CTAs)

| Domain | Form URL |
|--------|----------|
| Pastoral / Counselling | `https://forms.gle/L6DyfegmTCGHuSBk6` |
| Welfare | `https://forms.gle/NcScEq6WFDeBankw5` |

Eventual cutover locations: `/services` care section links (and any legacy static Connect links).

## Abuse controls

Validation + honeypot + **P4 server rate limit**. See [CARE_P4_CUTOVER.md](CARE_P4_CUTOVER.md).

**`FIRST_PARTY_ABUSE_CONTROLS_SUFFICIENT_FOR_INITIAL_LAUNCH`**

## Privacy / retention

- Narratives: HIGHLY_SENSITIVE  
- Pastoral Care retention: **12 months after closed** (jobs deferred)  
- Welfare retention: **12 months after closed** (jobs deferred)  
- Audit `care.request.received`: reference + service_type (+ safe `request_category` for welfare); never narrative/name/email/phone/additional  
- Public wording flagged for human/legal review before production  

## Staff identity blockers

**`PASTORAL_STAFF_IDENTITY_REQUIRED_BEFORE_CUTOVER`**  
**`WELFARE_STAFF_IDENTITY_REQUIRED_BEFORE_CUTOVER`**

Do not grant Care permissions to `media_admin` / `super_admin` for convenience.

## Out of scope (P3)

Celebration forms, Turnstile/Resend config, attachments/docs, government ID, bank statements, payments, AI, Search indexing of submissions, CTA cutover, Git commit/push.
