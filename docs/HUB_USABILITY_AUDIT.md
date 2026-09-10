# KCMI Hub usability audit (D1.6D)

**Persona:** first-time volunteer, no technical vocabulary.  
**Rule:** a route does not pass merely because the feature works.

Ratings:

- **Pass** — a first-time user can answer the six standard questions without jargon.
- **Partial** — they can finish the job, but one of the six questions is weak or live text still sits in an editable box.
- **Fail** — they would need a staff member to explain the screen.

| Route | What this page does | Where it appears publicly | Currently live visible | Next action obvious | Jargon replaced | Preview before public change | Buttons clear | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin` | Choose what to update | Cards name the public outcome | Livestream / featured program / branch count | Large action cards | Yes | N/A (chooser) | Cards are the action | **Pass** |
| `/admin/website` | Choose a website page | Each card says where copy appears | Index only | Cards | Yes | N/A | Yes | **Pass** |
| `/admin/website/home` | Homepage wording, photos, featured program | Top banner, welcome, prayer, giving, featured card | Read-only current + real component preview; featured program is a read-only title until Change | Change → Preview → Make live | Hero/CTA replaced | Yes (HomeHero, Welcome, program card) | Yes | **Pass** |
| `/admin/website/about` | About KCMI wording and portrait | About page and Lead Pastor page | Read-only current + preview | Change → Preview → Make live | Yes | Yes (text + portrait) | Yes | **Pass** |
| `/admin/website/services` | Ministries and care wording | Services page | Read-only current + preview | Change → Preview → Make live | CTA → button | Yes | Yes | **Pass** |
| `/admin/website/faqs` | Questions and answers | FAQs page | Read-only current + preview | Change → Preview → Make live | Yes | Yes | Yes | **Pass** |
| `/admin/website/global` | Contact, social, bottom of every page | Contact, footer, livestream visitor words | Read-only current + preview | Change → Preview → Make live | Global → information shown across the website | Yes | Yes | **Pass** |
| `/admin/website/sermons` | Sermons page headline and watch options | Sermons page | Read-only current + preview | Change → Preview → Make live | Yes | Yes | Yes | **Pass** |
| `/admin/programs` | List programs | Homepage when featured and live | Status badge in volunteer language | New program / open a row | Yes | N/A on list | Yes | **Pass** |
| `/admin/programs/new` | Create a draft | Not public yet | N/A (new) | Save as a draft | Placement in plain language | Explicitly not public yet | Yes | **Pass** |
| `/admin/programs/[id]` | Change a program and poster | Homepage featured card when live | Current vs change + card preview | Preview program; make live / remove | Cover → poster | Hub preview + public-component card | Yes | **Pass** |
| `/admin/sermons` | List sermons | Sermons page | Status badge | New sermon | Yes | N/A on list | Yes | **Pass** |
| `/admin/sermons/new` | Create a sermon draft | Not public yet | N/A | Save as a draft | YouTube link, not embed HTML | Not public yet | Yes | **Pass** |
| `/admin/sermons/[id]` | Change a sermon listing | Sermons page when live | Read-only current details; public card preview | Change these details → Preview → Make live | YouTube link | Yes (`SermonCard`) | Status buttons remain separate from details | **Pass** |
| `/admin/media` | Photo library | Photos used later on pages | Gallery of current library photos | Add photo / remove from library | Photos, not Media library as primary heading | Prepare/check photo look | Yes | **Pass** with note: context-first replace remains the preferred path |
| `/admin/branches` | Choose a branch | Locations pages | Public/hidden note | Open a branch | Yes | N/A | Yes | **Pass** |
| `/admin/branches/[id]` | Address, times, photos | `/locations/[slug]` | Read-only Address / Service times / Public contact; current top photo | Change branch details; copy-current is opt-in; Replace Photo | Hero → Top Photo | Branch page preview + top photo | Yes | **Pass** |
| `/admin/livestream` | Facebook live video | `/livestream` | Current status + safe preview | Paste embed → Check and Preview → Make Livestream Live | Embed explained with steps | Controlled iframe, not operator HTML | Yes | **Pass** |
| `/auth/sign-in` | Staff sign in | Not public content | N/A | Sign in | ADR/env names removed from primary copy | N/A | Sign in | **Pass** |
| `/auth/mfa` | 6-digit app code | Not public content | N/A | Continue to the Hub | QR described as connecting the authenticator app; TOTP/AAL2 not required to use the page | N/A | Continue | **Pass** |

## Remaining gaps (honest)

No remaining **Partial** caused by accidental in-place editing of live public values.

Notes that are not in-place-editing failures:

1. **Photos / Media Library** is still a shared library. Volunteers should prefer replacing a photo on the page where it appears. The library itself is not a website-copy editor.
2. **New program / new sermon** start with empty editable boxes because nothing is live yet. That is create-draft, not an in-place live editor.
3. **Events, Pastoral, and Giving Hub items** remain “soon” and are out of D1.6D scope.

## Tour and dashboard

- First Hub visit shows an optional tour; Skip and Replay work; completion key is `kcmi-hub-tour-v1-complete`.
- Dashboard heading is **What would you like to update?** with the six action cards required by D1.6C.
