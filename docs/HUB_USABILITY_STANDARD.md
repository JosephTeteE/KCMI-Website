# KCMI Hub usability standard (D1.6C)

**Audience:** volunteers who may have no technical vocabulary.  
**Test persona:** an 11-year-old helper who can follow short instructions.

This document is the volunteer-facing editing standard for KCMI Hub. Function that “works” is not enough. A first-time operator must be able to complete a change without knowing words such as CMS, hero, CTA, aspect ratio, embed, iframe, RLS, media asset, database, or slug.

## Six questions every routine public-content screen must answer

1. **What am I changing?**
2. **Where does this appear on the public website?**
3. **What is currently live?**
4. **How do I propose a change?**
5. **How do I preview it?**
6. **When does it become public?**

## Preferred editing pattern

Do **not** put currently-live text in an immediately editable box by default.

1. **Currently on the website** — read-only.
2. **Change this section**
3. **What would you like to show instead?** — empty boxes, plus **Use current text as my starting point**
4. **Preview my changes** — Hub-only preview; the public site does not change yet.
5. **Make this live on the website**
6. **Cancel changes**

Empty proposed boxes keep the current live wording. Public content must not change merely because an input received a keystroke.

Website Content drafts stay in the browser until make-live. Do not flip the live `website_documents` row to a hidden draft; that would take public copy down.

## Safe change flow

Current → Change → Preview → Publish (make live).

Use plain buttons. Prefer confirmation-before-write with the existing save actions. Keep revision/audit history for recovery. Do not add a second CMS version tree.

## Visual previews

Where practical, render the real public component in Hub (homepage top banner, welcome, program card, branch top photo, Facebook video preview). Desktop: preview beside the editor. Mobile: preview above the editor. Draft values update the Hub preview only.

## Language

Primary labels must be volunteer language. Technical terms may appear in secondary help.

| Avoid as primary | Prefer |
| --- | --- |
| Hero | Homepage Top Banner |
| CTA | Button visitors can click |
| Publish | Make this live on the website |
| Archive | Remove from public website |
| Global settings | Information shown across the website |
| Media library | Photos |
| Program cover | Program Poster / Main Photo |
| Branch media | Branch Photos |
| Footer | Bottom of every page |
| Embed / iframe | Facebook embed code (with steps) |

Do not ask volunteers to choose a technical crop when the placement already decides it.

## Media

Stay on the page where the photo appears. Show the current photo, where it appears, recommended use, Replace Photo, a new preview, and:

> Describe what is important in this photo for someone who cannot see it.

## Livestream

Facebook **embed code** is the primary workflow. Parse it server-side, keep only an allowlisted Facebook URL, discard the pasted HTML, and render KCMI’s own iframe. Never store or inject operator HTML.

## First-run tour

Lightweight, skippable, keyboard-accessible, mobile-usable, replayable from **Help & Tutorial → Replay Hub Tour**. Completion is stored in the browser (`kcmi-hub-tour-v1-complete`) because the HQ Content Admin identity may be shared across devices.

## Errors and destructive actions

Every error must say what to do next in ordinary language. Distinguish save/prepare, preview, make live, remove from website, and sign out. Keep remove/turn-off visually distinct. Avoid generic **Submit**.
