# KCMI Hub — Initial operating model (D1.4)

**Status:** Initial rollout guidance. Does **not** replace ADR-0003 or delete RBAC tables.  
**Production deploy:** not authorized by this document.

The database still uses stable technical role names (`super_admin`, `media_admin`, `pastoral_admin`, `branch_admin`, …). The names below are how KCMI should **staff the Hub at first**.

## Practical roles

### Super Admin (`super_admin`)

- Technical / platform administration
- Users, permissions, and system configuration (`users.manage`)
- Not used for routine media or branch-copy work
- **No automatic pastoral narrative access** (ADR-0003)

### HQ Content Admin (`media_admin`)

- **Intended initial account identity:** `kingdomcovenantministriesinter@gmail.com` (the public ministry Gmail already used for Contact — church-owned Hub login, not a shared password in Git)
- Manages **all normal public CMS** for headquarters and branches, centrally:
  - programs / announcements
  - public marketing media
  - sermons (YouTube URLs)
  - livestream (Facebook URLs)
  - branch public information, service times, and branch media
- May **publish** public CMS content (`programs.publish`, plus sermon/branch/livestream publish paths already in Hub)
- Must **not**:
  - manage platform security / RBAC except ordinary own-account settings (`users.manage` remains Super Admin)
  - manage pastoral narratives
  - change Giving destinations (`giving.change` remains later dual-approval / finance)
  - access infrastructure secrets

Branch-specific staff accounts are **not required** for this initial rollout.

### Pastoral Admin (`pastoral_admin`)

- **Future Phase E** — do not implement pastoral queues in D1
- Intended for an **individually identified** pastor
- May later handle approved pastoral queues and assignments
- Is **not** Super Admin
- No automatic CMS / platform administration

## Technical mapping (do not delete)

| Operating name | Database role | Initial use |
| --- | --- | --- |
| Super Admin | `super_admin` | Platform only |
| HQ Content Admin | `media_admin` | Default public CMS operator |
| Pastoral Admin | `pastoral_admin` | Dormant until Phase E |
| Branch Admin | `branch_admin` | **Dormant** until leadership wants decentralized branch logins |

`branch_staff_assignments` and `can_manage_branch` **remain**. HQ Content Admin may manage every branch’s public content without an assignment. A future `branch_admin` still only manages assigned branches.

## Future public branch pages

Public branch pages live at `/locations/[branch-slug]`. HQ Content Admin manages all branches centrally. `branch_staff_assignments` remains for future decentralized `branch_admin` logins.
