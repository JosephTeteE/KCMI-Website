# KCMI Public Experience V2 (D1.7)

**Status:** Implementation guidance for the D1.7 public recomposition and Hub legibility work.  
**Does not** authorize Search V2, D2 Giving administration, pastoral workflows, or full Events/Camp.

Related: [`KCMI_VOICE_GUIDE.md`](KCMI_VOICE_GUIDE.md), [`CMS_COVERAGE_MATRIX.md`](CMS_COVERAGE_MATRIX.md), [`CONTENT_VERIFICATION_GAPS.md`](CONTENT_VERIFICATION_GAPS.md).

---

## Visitor journey (Homepage)

| Order | Section | Visitor job | Content source |
| --- | --- | --- | --- |
| A | Top of Homepage (cinematic hero) | Feel identity + next action | `website_documents.home` hero fields + HQ service times from published Headquarters branch + livestream `is_live` for Watch Live state |
| B | KCMI Spotlight | Notice one featured program/event | Published featured `programs` row; **section omitted** when none |
| C | Discover KCMI | Choose a pathway | Home Discover/welcome fields + Services cell/teams offerings + `/about` |
| D | Watch & Listen | Engage media | Live livestream if `is_live`; else published featured/latest sermon; else home YouTube/Rehoboth Wells fallback |
| E | Find a KCMI Location | Orient geographically | Aggregated published branch count + countries; CTA to `/locations` (not a branch dump) |
| F | Prayer & Giving | Respond | Home prayer + giving CTAs (verified James 5:16 / Proverbs 11:25) |

Optional **Spotlight takeover** (operator-controlled): poster-led modal when Spotlight takeover is enabled for a published featured program. Frequency capped in browser storage. Not shown on Hub/auth.

Homepage **does not** list every branch card or repeat the full Vision/Mission wall in multiple sections.

---

## Empty-state rules (public)

| Missing data | Public behaviour |
| --- | --- |
| No featured program | Hide KCMI Spotlight (and takeover) |
| No branch service times | Omit times (no apology copy) |
| No branch media | Strong typographic/brand layout |
| No sermon | Compact YouTube / Rehoboth Wells invitation |
| Not live | Polished not-live Watch & Listen treatment |
| No events | Do not feature Events on Homepage |

Missing data warnings belong in **Hub** (“Needs attention”), not visitor prose.

---

## Competitor-pattern inspiration (IA only)

Modern Nigerian church sites inform **structure** only: strong hero, curated journeys, featured message/program, clear location finder, engagement pathways.

**Never** copy competitor wording, assets, or layouts verbatim. KCMI copy and media come from the Voice Guide source hierarchy.

---

## Hub ownership of dynamic surfaces

| Public surface | Hub destination (volunteer names) |
| --- | --- |
| Top of Homepage | Website Content → Homepage → Top of Homepage |
| KCMI Spotlight + optional takeover | Homepage → KCMI Spotlight |
| Discover KCMI | Homepage → Discover KCMI |
| Watch & Listen fallbacks | Homepage → Watch & Listen (+ Sermons / Livestream) |
| Find a Location section copy | Homepage → Find a Location section |
| Prayer & Giving | Homepage → Prayer & Giving |
| Branch finder facts | Branches |
| Live state / embed | Livestream |

---

## Locations finder

`/locations` is a **finder**: client-side search/filter over already-loaded public branches; country chips; compact cards (name, place, optional times summary, View location, Maps).

Full address, phones, emails, gallery → `/locations/[slug]` only.

---

## Hero video (future constraint — not D1.7)

Do **not** restore legacy multi‑MB WebM/MP4 autoplay heroes.

Future optional short-video mode must require:

- strong poster / image-first LCP
- muted by default
- short loop
- `prefers-reduced-motion` image fallback
- data-saver / constrained-network consideration
- strict byte budget (avoid free-tier-hostile transcoding pipelines)

D1.7 remains **image-first**.

---

## Visual section editor (Hub)

Homepage (and lightly About) Hub editing follows: **see the part of the page → edit this section → Words / Photo / Buttons → Current → Change → Preview → Make live**.

- Volunteers work against **typed** `website_documents.home` (and about) fields — not a freeform block JSON page builder.
- Overview shows a live public-component thumbnail per homepage section.
- Category editors open only the fields for that slice (for example banner Words vs banner Buttons vs banner Photo).
- KCMI Spotlight uses the existing featured-program chooser, not generic copy fields.

See [`CMS_COVERAGE_MATRIX.md`](CMS_COVERAGE_MATRIX.md) for Hub IA.

---

## Motion

Lightweight reveal / hover / live indicator / Spotlight transition only. No scroll-jacking. Respect `prefers-reduced-motion`.
