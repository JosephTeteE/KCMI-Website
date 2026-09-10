# Search V2 — next-phase inputs (D1.6B)

**Status:** Documentation only. Search V2 is **not implemented** in this phase.

Public CMS structure is now the input list below. Search must remain a **read of published public content**. It must never index Hub-only state, drafts, pastoral records, giving administration, auth, or audit tables.

## In scope later (published public content only)

| Surface | Structured fields Search can use | Source |
| --- | --- | --- |
| Home | Hero/welcome headings and supporting text (published website document `home`) | `website_documents` |
| About KCMI | Who we are, vision, mission paragraphs | `website_documents` `about` |
| Lead pastor page | Name, role, verified biography paragraphs | same `about` document / `/about/apostle-frank-aikins` |
| Services | Intro, cell/teams copy, care section labels (not form payloads) | `website_documents` `services` |
| FAQs | Question + answer paragraphs | `website_documents` `faqs` |
| Locations | Branch name, city, country, address lines, public service times | `church_branches` + `branch_service_times` where `status = published` |
| Branch detail | Same plus image alt/captions for published `branch_media` | `/locations/[slug]` |
| Sermons | Title, speaker, date, scripture, summary (not private notes) | `sermons` where published |
| Programs | Title, short description, dates of **published** programs | `programs` |
| Contact / global | Public email/phone labels, DFR heading (not Hub emails) | `website_documents` `global` |
| Livestream | Public heading/messages only | livestream settings + global copy |
| Giving (display) | Page intro copy already on `/giving` — **not** Hub dual-approval workflows | seed until D2 |
| Privacy / Terms | Public legal document headings | counsel-controlled documents |

## Out of scope (must never be searchable)

- Draft, preview, or archived CMS rows
- `content_revisions` snapshots
- `audit_events`
- Hub staff profiles, roles, MFA state
- Pastoral, counselling, welfare, or prayer **narratives** (not implemented; still forbidden)
- Giving destination administration / payment evidence (D2)
- Event registration payloads and receipts (Events/Camp phase)
- Storage paths that are not public marketing URLs
- `/admin/*`, `/auth/*`, `/api/*`, `/qa/*`

## Ranking / UX notes for the later phase

- Prefer exact branch names and FAQ questions over raw body dumps.
- Do not invent a result when no published document matches.
- Keep the public search UI out of Hub chrome.
- Staging must remain noindex even after Search exists.

## Dependencies that should be stable before implementation

1. Published `website_documents` keys (`home`, `about`, `services`, `global`, `faqs`, `sermons_page`).
2. `/locations/[slug]` as the public branch permalink.
3. Human confirmation of remaining items in `CONTENT_VERIFICATION_GAPS.md` that Search might otherwise treat as facts (phones, Silverbird schedule, Facebook canonical URL).
