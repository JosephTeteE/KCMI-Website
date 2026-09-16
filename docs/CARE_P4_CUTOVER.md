# Care P4 — Cutover readiness + abuse hardening

**Status:** Implemented in platform (intake still **OFF** by default; no visitor CTA cutover)  
**Depends on:** Care P1–P3

## HUMAN_PRIVACY_COPY_APPROVAL_REQUIRED

Public privacy wording on `/prayer`, `/pastoral-care`, and `/welfare` is a final staging draft. Human/legal approval is required before production cutover.

## Anti-abuse model

| Control | Status |
|---------|--------|
| Feature gates (per domain) | Required; default OFF |
| Server Zod/validation | Required |
| Honeypot (`company`) | Required; generic reject message |
| Server rate limit | **P4** — hashed requester key + DB counter |
| Turnstile | **Optional** — not configured in P4 |

### Rate-limit design

- Table: `care_intake_rate_limits` (hashed key, service_type, window bucket, attempt_count)
- RPC: `care_intake_rate_limit_consume` (service_role only)
- Limit: **8 attempts / hour / Care domain / salted requester key**
- Requester key: HMAC-SHA256 over address header material with server secret (never store/log raw IP)
- Separate counters per `prayer` / `pastoral` / `welfare`
- Shared Wi‑Fi friendly: one NAT is not capped at 1–2 attempts
- No narrative/PII/user-agent dump in rate-limit rows
- RPC purges stale buckets; not for analytics
- Rate-limit infra failure → **fail open** (allow) + safe technical log (pastoral availability)

### Turnstile decision

**`FIRST_PARTY_ABUSE_CONTROLS_SUFFICIENT_FOR_INITIAL_LAUNCH`**

Gates + honeypot + per-domain server rate limits are enough for initial controlled cutover. Reassess Turnstile if automated spam appears after a domain is live.

## Independent intake gates

```bash
KCMI_PRAYER_INTAKE_ENABLED=1
KCMI_PASTORAL_INTAKE_ENABLED=1
KCMI_WELFARE_INTAKE_ENABLED=1
```

Each is independent. Prayer may cut over before Welfare. There is **no** global Care switch.

## Staff readiness (minimum)

Do **not** invent accounts. Do **not** grant Care access to `super_admin`, `media_admin`, or `finance_reviewer` for convenience.

| Domain | Minimum |
|--------|---------|
| Prayer | ≥1 real identity with `prayer.read` (+ `prayer.assign` if routing needed) |
| Pastoral Care | ≥1 real identity with `counselling.read`, plus assignment path (`counselling.assign` and/or pastoral_admin workflow) so pastors can open assigned cases |
| Welfare | ≥1 real identity with `welfare.read` (`welfare.assign` optional) |

One authorized person may hold multiple Care domains if leadership assigns that responsibility.

**All Care identities: MFA / AAL2 before cutover.**

## CTA cutover map (DO NOT SWITCH YET)

| Domain | Current Google Form | Future first-party route | Surfaces |
|--------|---------------------|--------------------------|----------|
| Prayer | `https://forms.gle/gKTwNc9gNiVCWWrJ6` | `/prayer` | Homepage `prayerCtaHref`; `/services` “Prayer request form”; `/faqs` prayer answer; seed `engagement.ts`; website defaults |
| Pastoral / Counselling | `https://forms.gle/L6DyfegmTCGHuSBk6` | `/pastoral-care` | `/services` “Counselling request form”; website defaults care links |
| Welfare | `https://forms.gle/NcScEq6WFDeBankw5` | `/welfare` | `/services` “Welfare request form”; website defaults care links |

Celebration (`https://forms.gle/QxiASWogkGFamvEJ8`) remains **outside Care** (engagement/communications backlog).

## Cutover runbook (per domain)

1. Designated Care staff exists  
2. Correct DB permissions granted  
3. MFA/AAL2 confirmed  
4. Rate-limit + honeypot active (migration applied)  
5. Intake flag enabled on **staging** only  
6. Synthetic submission succeeds  
7. Authorized Hub staff sees request (AAL2)  
8. Privacy copy approved (`HUMAN_PRIVACY_COPY_APPROVAL_REQUIRED` cleared)  
9. CTA changes: Google Form → first-party route (one primary CTA; no dual competing forms)  
10. Hosted acceptance  
11. Only then repeat for production (explicit HUMAN instruction)

## Fallback strategy

Keep Google Form URLs in source/docs as documented fallback. If first-party intake fails operationally: disable the domain gate and restore Google Form CTA. Do not delete Form URLs from history during initial cutover.

## Logging / privacy

Allowed: service type, outcome class, technical error code, reference after success.  
Forbidden: narrative, name, email, phone, additional info, raw IP.

## Retention readiness

| Class | Policy |
|-------|--------|
| Prayer (closed) | 6 months after closed |
| Pastoral / Welfare (closed) | 12 months after closed |
| Case notes | Same as parent |
| Audit metadata | 24 months |
| Rate-limit rows | Short-lived (window purge) |

**Ops requirement before long-lived production Care:** implement scheduled deletion jobs (auditable; honor retention holds). Not built in P4.

## Staging Youth Pastor Prayer onboard

Authorized staging Prayer identity (HUMAN-designated):

- Email: `christophercookey@gmail.com`
- Role: `prayer_staff` (`hub.access` + `prayer.read` only)
- Script: `platform/scripts/onboard-staging-prayer-youth-pastor.mjs`

MFA/AAL2 required before Prayer staging cutover acceptance.

Sign-in / enroll:

- https://kcmi-preview.josephtete.com/auth/sign-in
- https://kcmi-preview.josephtete.com/auth/mfa
- https://kcmi-preview.josephtete.com/admin/care/prayer
