# KCMI Digital Platform — Product Vision

**Status:** PROPOSED (governance document)  
**Related:** [PHASE_0_INVENTORY.md](../PHASE_0_INVENTORY.md), [ARCHITECTURE_V1_DRAFT.md](ARCHITECTURE_V1_DRAFT.md)

---

## Purpose

Rebuild the KCMI / Rehoboth Christian Center digital platform so that:

1. The **public** can find accurate worship, location, sermon, giving, and event information with excellent performance and accessibility.
2. **Approved church staff** can operate day-to-day content and pastoral workflows through **KCMI Hub** without editing source code.
3. The platform remains **maintainable** when the original developer is unavailable.
4. **Pastoral privacy** and payment evidence are protected by design (server/database controls, not UI obscurity).

## Non-goals

- Line-by-line translation of the legacy HTML/JS application.
- Copying legacy security or media patterns merely because they exist today.
- Implementing the new application before architecture ADRs are accepted.
- Storing secrets, recovery codes, or passwords in Git documentation.

## Audiences

| Audience | Outcome |
|----------|---------|
| Visitors / seekers | Fast, clear public site; trustworthy contact and location info |
| Members | Sermons, programs, giving guidance, events |
| Media / communications staff | Publish programs, flyers, sermons metadata without engineering |
| Pastoral staff | Process prayer/counselling/welfare with least privilege |
| Registrars / finance reviewers | Event registration and private payment-evidence review |
| Platform owners | Church-owned accounts, auditability, recoverable operations |

## Success principles

- Structured content over arbitrary WYSIWYG HTML where possible.
- Draft → Preview → Publish → Archive for publishable content.
- Image-first, performance-first public experience.
- Reusable **events** platform instead of one-off camp repositories.
- Legacy site remains available as reference until controlled cutover.

## Standards (targets)

- **OWASP ASVS 5.0 Level 2** (PROPOSED verification target)
- **WCAG 2.2 AA**
- Secure development practices consistent with current **NIST SSDF** guidance

## Legacy constraint

**VERIFIED CURRENT STATE:** Legacy static site + Render API + camp submodule exist in this repository (see Phase 0 inventory).  
**PROPOSED:** Rebuild beside legacy; do not destructively refactor production legacy during documentation and foundation phases.
