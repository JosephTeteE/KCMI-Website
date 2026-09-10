# KCMI voice and content source guide (D1.6B)

**Status:** Editorial guidance for public website copy.  
**Does not** authorize invented theology, history, statistics, or doctrine.

## Source hierarchy

Use sources in this order. Do not skip to a lower tier when a higher tier already answers the field.

1. **Verified legacy KCMI content already in this repository**  
   Public HTML under `public/` (especially `index.html`, `mission-kcmi.html`, `about-apostle-aikins.html`, `services.html`, `sermons.html`, `location.html`, `contact-us.html`, `faqs.html`) and the migrated seeds under `platform/src/content/seed/`.
2. **Official KCMI public website or ministry material already identified** in architecture, Phase 0 inventory, or `docs/CONTENT_VERIFICATION_GAPS.md`.
3. **Official Apostle Frank / KCMI ministry material** only when it is already identified in-repo or by the human operator. Do not scrape or invent quotations.
4. **Human verification** for unresolved conflicts (phones, schedules, social canonical URLs, legal text).

Never invent church-history facts, membership numbers, miracle claims, unverified schedules, or doctrinal expansions.

Related: [`CONTENT_VERIFICATION_GAPS.md`](CONTENT_VERIFICATION_GAPS.md), [`CMS_COVERAGE_MATRIX.md`](CMS_COVERAGE_MATRIX.md).

## Canonical language (verified)

| Item | Canonical wording | Source |
| --- | --- | --- |
| Legal name | Kingdom Covenant Ministries International | `public/index.html` schema / identity seed |
| Short name | KCMI | same |
| Alternate name | Rehoboth Christian Center | same |
| Vision | **Raising Kings To Build The Kingdom** | `public/mission-kcmi.html`, footer, identity seed |
| Mission | Use all creative biblical means to bring people into relationship with Christ. Prayerfully disciple them, helping them to find their ministries and encouraging them to fulfill their calling. This we do one person at a time, then to the family, then to the community. Until a Nation is won for Christ! | `public/mission-kcmi.html` |
| Supporting line (home) | Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ! | identity seed / legacy home |
| Lead pastor | Apostle Philemon Frank Aikins, Senior Pastor and Founder | `public/about-apostle-aikins.html` |
| Headquarters | Port Harcourt, Nigeria | about seed / location HQ |

Keep mission and vision **faithful to source**. Do not paraphrase the vision into a slogan the church has not used. Capitalization of the vision line follows the mission page: **Raising Kings To Build The Kingdom**.

## Voice

Public copy should be:

- **Christ-centered** — Christ, Scripture, and discipleship are the centre, not the institution as a brand.
- **Kingdom-focused** — aligned with the verified vision: raising kings to build the Kingdom.
- **Biblical** — when Scripture is used, quote verified existing citations (for example James 5:16 and Proverbs 11:25 already on the home CTAs). Do not invent new proof-texts.
- **Discipling** — formation, calling, family, and community (from the verified mission), not consumer spirituality.
- **Purposeful** — say what the visitor should do next (worship, locations, sermons, prayer form, giving).
- **Hopeful** — hope with substance; Apostle Frank’s public bio already names hope, passion, humor, and compassion. Do not embroider.
- **Direct and mature** — complete sentences, no hype, no unexplained jargon.

Leadership supports the **ministry story**. The church page (`/about`) is about KCMI’s identity, vision, and mission. The long biography belongs on `/about/apostle-frank-aikins`.

## Words to avoid unless verified as KCMI language

Do not use generic church-template or AI marketing phrasing such as:

- “your spiritual journey”
- “a vibrant community”
- “discover your unique path”
- “we’re so excited to meet you”
- “come as you are” (unless found in verified KCMI copy)
- vague “impact,” “excellence,” or growth-hype with no source

The legacy services intro used “your spiritual journey.” That is **not** treated as canonical KCMI voice for V2; replace with factual ministry language from the hierarchy above.

## What staff may edit vs what engineering owns

Staff (HQ Content Admin) may edit routine public **content**: headlines, supporting paragraphs, CTAs, FAQs, contact identity, social labels/URLs (allowlisted domains), sermons metadata, branch public facts, and assigned images.

Engineering / counsel own: layout, design tokens, navigation structure, security, RBAC, giving destinations (D2), pastoral workflows, Search V2, Events/Camp registration, and legal documents pending human/legal review.

## Unresolved items stay in the gaps log

If a fact is not in the hierarchy, leave it unpublished or keep the visitor-facing empty state. Record the question in [`CONTENT_VERIFICATION_GAPS.md`](CONTENT_VERIFICATION_GAPS.md). Do not guess.
