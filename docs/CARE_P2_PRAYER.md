# Care P2 — First-party Prayer intake

**Status:** Implemented in platform (intake **disabled by default** until HUMAN cutover)  
**Depends on:** Care P1 (`pastoral_requests`, Hub Care → Prayer)

## Verified legacy Google Form fields

| Legacy field | Required | P2 decision |
|--------------|----------|-------------|
| What is your name? | required | Optional unless prayer call requested |
| Email address | optional | Optional |
| Phone number | required | Required only if prayer call requested |
| Prayer request | required | Required (single narrative) |
| Comfortable with a prayer call? Yes/No | — | Maps to `contact_requested` |
| Additional information | optional | **Removed** — avoid duplicate HIGHLY_SENSITIVE free text |

Branch and preferred timing: not on the verified legacy form → **not collected in P2**.

## Anonymous Prayer

Allowed when prayer call = No: name, phone, and email may all be null.  
Do not store placeholder values (`Anonymous`, `N/A`, etc.).

## Intake cutover gate

Server env (not `NEXT_PUBLIC_`):

```bash
KCMI_PRAYER_INTAKE_ENABLED=1
```

Unset / `0` / `false` → first-party submit **fail closed**.  
`/prayer` still renders calmly and points visitors to the existing Google Form.

**HUMAN enable steps:** set env on staging/preview host → redeploy → verify Hub queue with synthetic submit → later replace Google Form CTAs (separate approval).

## Google Form remains live (P2 does not change)

Cutover candidates (unchanged in P2):

- Homepage Prayer CTA
- `/services` Prayer request form link
- `/faqs` prayer answer link
- Legacy static Connect nav if still served

Canonical Form URL: `https://forms.gle/gKTwNc9gNiVCWWrJ6`

## Abuse controls

P2 originally shipped validation + honeypot only.  
**P4** adds server-side hashed rate limiting. See [CARE_P4_CUTOVER.md](CARE_P4_CUTOVER.md).

**`FIRST_PARTY_ABUSE_CONTROLS_SUFFICIENT_FOR_INITIAL_LAUNCH`** (P4 assessment)

## Privacy / retention

- Narrative: HIGHLY_SENSITIVE  
- Contact fields: PERSONAL  
- Retention: **6 months after closed** (deletion jobs deferred)  
- No Resend, Search indexing of submissions, AI, attachments, or historical Form import  
- Audit `care.request.received` / `care.request.opened`: no name/phone/email/narrative  

## Staff identity

**`CARE_STAFF_IDENTITY_REQUIRED_BEFORE_PRAYER_CUTOVER`**

Do not grant Prayer access to `media_admin` or `super_admin` for convenience.
