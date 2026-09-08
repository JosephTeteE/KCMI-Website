# KCMI Ownership Register (TEMPLATE)

**Status:** TEMPLATE ONLY — no secrets  
**Rule:** NEVER put passwords, API keys, recovery codes, tokens, or connection strings in this file.

**Operating model (PROPOSED):** Church-owned service identities/accounts with **named** individual administrators and backup administrators. Do **not** use shared passwords as the collaboration mechanism. Track migration away from scattered personal accounts without placing credentials in Git.

Fill cells with names/emails of responsible people and account **identity labels** (e.g. “church Vercel team”), never secret material.

---

## Registry

| Service | Purpose | Canonical church owner identity | Named backup administrators | Recovery ownership | Billing owner | Production / Staging | Migration status | Notes |
|---------|---------|-----------------------------------|------------------------------|--------------------|---------------|----------------------|------------------|-------|
| DNS / Cloudflare | Domain DNS, edge | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | Prod / Staging | Not started | |
| Vercel — main site | Public web hosting | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | Legacy today — EXTERNAL VERIFICATION REQUIRED for project IDs |
| Vercel — camp / events | Camp or events host | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | Legacy camp submodule deploy |
| Render — API | Legacy Express API | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | Target: decommission after cutover |
| Supabase (future) | Auth, Postgres, Storage | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | Not provisioned in-repo | PROPOSED platform |
| KCMI Hub — HQ Content Admin | Public CMS (programs, media, sermons, livestream, branch public info) | `kingdomcovenantministriesinter@gmail.com` (intended initial identity; see [OPERATING_MODEL.md](OPERATING_MODEL.md)) | `[TBD]` | `[TBD]` | `[TBD]` | Staging first | Not production | Maps to database role `media_admin`. Not Super Admin. |
| MySQL / Aiven | Legacy livestream DB | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | |
| Cloudinary | Legacy camp receipts | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | Public URL pattern — replace |
| Google Workspace APIs | Sheets/Calendar/Drive | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | |
| SMTP / mailbox | Transactional + forms inbox | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | Resend PROPOSED for app mail |
| Resend (future) | Transactional email | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | DECISION REQUIRED |
| YouTube | Sermon video hosting | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | |
| reCAPTCHA / bot protection | Anti-abuse | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | |
| GitHub org / repos | Source control | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | |
| Error/uptime monitoring | Observability | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | | | DECISION REQUIRED product |

## Completion checklist

- [ ] Every production service has a church owner identity (not only a personal account)
- [ ] Every production service has at least one named backup administrator
- [ ] Recovery ownership documented (who can reset MFA / reclaim org)
- [ ] Billing owner documented
- [ ] Staging vs production accounts distinguished
- [ ] Secrets live only in approved vaults / provider secret stores — **not** in this file
