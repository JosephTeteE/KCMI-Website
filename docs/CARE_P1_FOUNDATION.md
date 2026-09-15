# Care P1 — Private Care security foundation

**Status:** Implemented in platform (migration not applied to staging/production until HUMAN review)  
**Scope:** Hub Care shell + `pastoral_requests` / `pastoral_case_notes` + RLS/RBAC/AAL2. **No public forms.**

## Domains

| Hub label | `service_type` | Read permission | Assign permission |
|-----------|----------------|-----------------|-------------------|
| Prayer | `prayer` | `prayer.read` | `prayer.assign` |
| Pastoral Care | `pastoral` | `counselling.read` | `counselling.assign` |
| Welfare | `welfare` | `welfare.read` | `welfare.assign` |

Permission IDs keep historical `counselling.*` names; Hub UX says **Pastoral Care**.

## Privacy

- Visitor narratives and staff notes: **HIGHLY_SENSITIVE**
- Contact identity: **PERSONAL**
- Status / assignment / timestamps: **INTERNAL**
- Audit metadata: actor, request id, action, timestamp, safe domain fields — **never** narrative or note body
- **No** public Search / CMS Search / sitemap / analytics / AI / content_revisions / ordinary logs for narratives
- **No** bulk CSV export
- **No** visitor attachments in V1
- **No** historical Google Forms / email import

## Retention (provisional — HUMAN-approved; jobs deferred)

| Class | Policy |
|-------|--------|
| Prayer | 6 months after closure |
| Pastoral Care | 12 months after closure |
| Welfare | 12 months after closure |
| Staff notes | Same as parent request |
| Audit metadata | 24 months |

Deletion automation is **not** in P1.

## Access rules

- `media_admin`, `finance_reviewer`, `auditor`, `super_admin`: **no** automatic narrative access
- Prayer: shared queue for `prayer.read`
- Pastoral: `counselling.read` **and** (assigned to self **or** `counselling.assign`)
- Welfare: shared queue for `welfare.read`
- Reopen closed requests: domain `*.assign` only
- Hub Care reads/mutations: existing Hub **AAL2** (layout MFA + `assertAal2` / `requireStaffAction`)
- Hub uses **authenticated** Supabase client (RLS). No service-role Hub narrative API.

## Public intake

Google Forms remain the visitor path until HUMAN enables `KCMI_PRAYER_INTAKE_ENABLED` and later replaces Form CTAs. See [CARE_P2_PRAYER.md](CARE_P2_PRAYER.md).

## Hub routes

- `/admin/care`
- `/admin/care/prayer`
- `/admin/care/pastoral`
- `/admin/care/welfare`
- `/admin/care/[requestId]`

Unauthorized staff: no Care nav, no dashboard Care card, no request metadata.

## Reference codes

Format `KCMI-CARE-XXXXXX` (non-sequential hex). No public status lookup.

## Pastor grants

Default `pastor` role has `hub.access` only. Explicit Care domain permissions must be granted via DB `role_permissions` (or a dedicated role).

**Runtime source of truth for Care permissions:** database `role_permissions` only (fail closed). TypeScript `DEFAULT_ROLE_PERMISSIONS` may document seed expectations but must **not** restore or expand Care access when a DB grant is absent or revoked. Non-Care Hub permissions may still use TS defaults ∪ DB for compatibility.