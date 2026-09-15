# Giving V1 — dual-approval destination management

**Status:** Staging cutover to verified DB destinations.  
**Public source (staging/preview):** published `giving_accounts` rows.  
**Seed file:** retained as bootstrap/reference (`getGivingAccountsSeed()`); not deleted.

## Product principles

- **Giving ≠ Event payment.** Voluntary church giving only.
- No Paystack / Stripe / Flutterwave in this phase.
- No donor database, donor forms, donation history, or payment narratives.
- Manual Camp/Event fee architecture must not be reused.
- `external_url` exists for a future verified provider destination and requires dual approval; do not expose publicly until a real destination exists.

## Public `/giving` (current)

- **Staging/preview:** `fetchPublishedGivingAccounts()` → published DB rows only.
- **CONTENT_SOURCE=seed (local):** still returns `giving.ts` for offline work.
- Intro/blessing copy remains seed (`getGivingPageIntro()`).
- Copy-account-number restored on account numbers.

## Bootstrap provenance

Initial live rows were migrated from `platform/src/content/seed/giving.ts` after human reconfirmation that those public destinations remain official. Bootstrap is **not** a maker/checker change. Future destination edits require dual approval.

| stable_key | Purpose |
| --- | --- |
| `general-ecobank` | General Giving |
| `care-union` | Care Group Giving |
| `international-zenith` | International Giving (USD/GBP/EUR) |

## Data model

| Table | Purpose |
| --- | --- |
| `giving_accounts` | Structured destinations (bank, account name, SWIFT, external URL, visitor_note, status, **version**) |
| `giving_account_numbers` | Per-currency account numbers (not opaque JSON) |
| `giving_change_proposals` | Maker/checker proposals with `base_snapshot` + `proposed_snapshot` |

No donor/transaction tables.

## Dual-approval boundary

**Requires maker/checker:** bank name, account name, account numbers, currency, SWIFT/BIC, external URL, enable/disable, replace destination details, visitor_note.

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

### Pre-launch governance

**FINANCE_REVIEWER_REQUIRED_BEFORE_PRODUCTION_OPERATIONS** / **CHECKER_IDENTITY_REQUIRED_BEFORE_PRODUCTION** — a second finance-authorized identity must exist before production dual-approval operations. Do not grant `media_admin` approval rights.

### Legacy `giving.change`

**Retired for writes:** all `role_permissions` grants removed. Permission row retained as **DEPRECATED** for historical audit only.

## Audit

`audit_events` records bootstrap provenance (`giving.bootstrap.seed`) plus proposal create/submit/withdraw/reject/approve and account apply.

## Future payment provider (document only)

Church-owned merchant account; provider-hosted/secure checkout; no raw card data at KCMI; verified webhooks; server-only secrets; reconciliation/audit. Not implemented here.
