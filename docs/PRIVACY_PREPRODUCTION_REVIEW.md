# Privacy pre-production review (KCMI V2)

**Status: PRE-PRODUCTION HUMAN / LEGAL REVIEW REQUIRED**

This file is an internal checklist. It does **not** invent legal conclusions, consent language, or retention commitments.

Companion inventory: [`DATA_PROCESSING_INVENTORY.md`](DATA_PROCESSING_INVENTORY.md).  
Public visitor text lives in `platform/src/content/seed/legal-privacy.ts` and must stay aligned with **actual** V2 processing until counsel replaces it.

Production deploy of a Privacy Policy is **not** authorized by this document.

## Why the legacy policy cannot stay

The migrated `public/privacy-policy.html` text described systems that **this V2 platform does not operate**, including combinations of:

- Google Drive receipt storage
- Google Sheets registration capture
- Google Calendar / Gmail API operations as current site behaviour
- JWT admin console and short JWT expiry
- Livestream **embed code** management
- reCAPTCHA v2/v3 as current public-site bot protection
- Camp/event receipt retention periods tied to that legacy stack

Leaving those statements on `/privacy` would tell visitors the wrong architecture.

## What the public draft is allowed to say

Only facts that can be pointed to in the inventory:

- The public website and Hub are hosted as a Next.js application (currently Vercel).
- Staff Hub authentication uses Supabase Auth with MFA for Hub actions.
- Public CMS, sermon metadata, branch information, livestream URL/live flag, and marketing images are stored in Supabase (database / public marketing storage).
- Visitors are sent to named third parties (YouTube, Facebook, Instagram, X, TikTok, Spotify, Google Forms, Google Maps, Silverbird’s site) via published links.
- This V2 site does **not** currently run first-party camp/event registration or receipt upload.
- Staging is not offered for search indexing.

The public draft must **not**:

- Promise specific retention periods that are not implemented
- Assert GDPR/NDPR legal bases, lawful-processing theories, or “you have these rights” catalogues invented by AI
- Describe pastoral case handling as a live V2 data flow
- Describe Giving destination administration as live Hub processing (D2 not started)
- Re-introduce legacy JWT / Drive / Sheets / reCAPTCHA claims

## Human / legal review checklist (not completed by this phase)

- [ ] Confirm `contact@kcmi-rcc.org` is monitored for privacy enquiries
- [ ] Confirm whether the public host name in the notice should be `kcmi-rcc.org`, `www.kcmi-rcc.org`, or both after cutover
- [ ] Decide consent / cookie / analytics language **if** any analytics product is introduced
- [ ] Decide how Google Forms responses are retained and who in the ministry can access them
- [ ] Decide retention and deletion for Hub audit logs and CMS revisions
- [ ] Decide camp/event privacy text **when** V2 Events registration ships (legacy camp remains separate until then)
- [ ] Counsel sign-off before production
- [ ] Replace the public “pre-production review” banner after sign-off

## Terms of Service (review only)

`platform/src/content/seed/legal-terms.ts` is still the July 16, 2025 legacy Terms, formatted only.

**Stale implementation notes (no silent rewrite of legal meaning in D1.6B):**

- §1 names `https://kcmi-rcc.org` as the Service URL — confirm apex vs `www` at cutover (**EXTERNAL VERIFICATION REQUIRED**).
- §4 third-party examples (YouTube, TikTok, Google Forms) still match current outbound links.
- §9 contact `contact@kcmi-rcc.org` now matches the V2 public contact identity; confirm mailbox monitoring.

No material Terms rewrite was made in D1.6B. Proposed later change (counsel): align the named host with the production canonical after cutover, without changing the rest of the clauses unless counsel edits them.
