# Giving V1 — dual-approval destination management

**Status:** Hub management + schema implemented (Giving D2 core).  
**Public cutover:** **NOT done** — `/giving` remains seed/legacy-backed until human re-confirms financial destinations.

## Product principles

- **Giving ≠ Event payment.** Voluntary church giving only.
- No Paystack / Stripe / Flutterwave in this phase.
- No donor database, donor forms, donation history, or payment narratives.
- Manual Camp/Event fee architecture must not be reused.
- `external_url` exists for a future verified provider destination and requires dual approval; do not expose publicly until a real destination exists.

## Public `/giving` (current)

- Source: `platform/src/content/seed/giving.ts` via `getGivingAccounts()` / `getGivingPageIntro()`.
- Database Giving tables may hold STAGING QA or pre-cutover rows; **they do not drive the public page yet**.

## Data model

| Table | Purpose |
| --- | --- |
| `giving_accounts` | Structured destinations (bank, account name, SWIFT, external URL, status, **version**) |
| `giving_account_numbers` | Per-currency account numbers (not opaque JSON) |
| `giving_change_proposals` | Maker/checker proposals with `base_snapshot` + `proposed_snapshot` |

No donor/transaction tables.

## Dual-approval boundary

**Requires maker/checker:** bank name, account name, account numbers, currency, SWIFT/BIC, external URL, enable/disable, replace destination details.

**Does not:** Giving page intro/blessing copy, homepage internal `/giving` CTA label/copy (existing `website.manage`).

## Workflow

1. Maker creates draft proposal (`giving.propose` + **AAL2**).
2. Maker reviews CURRENT vs PROPOSED → **Submit for approval** (AAL2).
3. Pending proposals are not silently editable. Maker may **Return to draft** to edit.
4. Checker (different identity, `giving.approve` + AAL2) reviews exact diff.
5. **Approve and publish** applies live DB change **atomically** (Approve = publish).
6. Reject requires a short reason; live destination unchanged.

**No self-approval**, including `super_admin`.

**Stale protection:** `base_version` must match live `version` or approval fails; other pending proposals on the same destination are **superseded**.

## Permissions

| Permission | Roles (default) |
| --- | --- |
| `giving.propose` | `super_admin`, `finance_reviewer` |
| `giving.approve` | `super_admin`, `finance_reviewer` |
| View admin | either of the above, or `audit.read` |

`media_admin` receives **neither**.

### Legacy `giving.change`

**Retired for writes:** all `role_permissions` grants removed. Permission row retained as **DEPRECATED** for historical audit only. Application RBAC uses only `giving.propose` / `giving.approve`. There is no path where `giving.change` updates live destinations.

## Audit

`audit_events` records: proposal create/submit/withdraw/reject/approve and account apply. Proposal table remains authoritative for before/proposed snapshots.

## Implementation sequence

| Phase | Scope | Status |
| --- | --- | --- |
| G1–G3 | Schema + Hub + maker/checker | This delivery |
| G4 | Migrate human-verified financial content | Pending human confirmation |
| G5 | Hosted acceptance + public cutover | Pending |

## Future payment provider (document only)

Church-owned merchant account; provider-hosted/secure checkout; no raw card data at KCMI; verified webhooks; server-only secrets; reconciliation/audit. Not implemented here.
