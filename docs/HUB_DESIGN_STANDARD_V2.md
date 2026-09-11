# KCMI Hub Design Standard V2

**Status:** NORMATIVE — authoritative for every Hub feature from D1.8 onward  
**Based on:** D1.7 Hub product/interaction audit (2026-09-11); implemented in D1.8  
**Audience:** Product + engineering for KCMI Hub  
**Companion audits:** `HUB_INTERACTION_MAP.md`, `HUB_TYPOGRAPHY_AUDIT.md`, `PROGRAM_EDITOR_AUDIT.md`

No future Hub phase (Giving, Events, Pastoral, Search administration) invents its own interaction rules. Extend this standard; do not fork it.

This document establishes durable rules so Hub work is standards-driven rather than issue-by-issue.

---

## 1. North star

An **11-year-old first-time volunteer** can complete one clear job:

> See what is live → propose a change → preview → make it live  

without training, without breaking the public website by accident, and without decoding engineering vocabulary.

---

## 2. One primary task per focused editor

| Rule | Detail |
| --- | --- |
| One job | Each focused screen answers one question (“Change Homepage words”, “Add program dates”, “Turn livestream on”). |
| One primary action | Exactly one emphasized submit (usually **Make this live** or **Save draft**). |
| Secondary actions | Quiet styling; never compete visually with the primary. |
| No field dumps | If a screen needs scrolling past ~one viewport of unrelated fields, split it. |

**Anti-patterns to retire:** Homepage Words+URLs+Spotlight advanced on one path; Program create with placement+CTA+schedule+poster together; Global “everything contact” megapage.

---

## 3. One Back / navigation pattern

| Layer | Control | Label rule |
| --- | --- | --- |
| 1 | Persistent Hub nav | Area names only |
| 2 | Page header parent link | `← {Parent name}` (never bare “Back”) |
| 3 | In-flow step | `Choose a different section` / `Cancel` — not “Back” |
| 4 | Tour | `Previous step` / `Next step` / `Skip tour` |
| 5 | Browser history | Not relied on for editor state |

Never show two controls that both read as “Back” on the same screen.

---

## 4. Progressive disclosure

1. **Show current live state first** (readable).  
2. **Change** reveals only fields for the chosen task.  
3. **Advanced** (takeover windows, raw embed paste, archive) behind explicit disclosure.  
4. Never show raw URL or embed fields before the volunteer chooses a content-action task.

---

## 5. Structural vs editable visitor buttons

| Class | Examples | Hub rule |
| --- | --- | --- |
| **A Structural** | Plan a Visit, Watch Live, Find a Location, Contact, Give (site path) | Engineering-controlled defaults; volunteers do **not** edit destination; label changes require elevated permission or ticket |
| **B Content action** | Program registration, promo video, Google Form while pastoral/giving platforms migrate | Label + destination editable; destination picker preferred over raw URL when possible |
| **C Unnecessary flexibility** | Editing `#worship` / `/livestream` paths | Remove from volunteer UI |

---

## 6. Media — contextual-first

| Rule | Detail |
| --- | --- |
| Default | Replace/upload photo **on the page where it appears** |
| Library | Browse/reuse/archive only; not the required first step |
| Create flows | Must allow contextual upload (Programs today fail this on `/new`) |
| Copy | “Photos” not “Media Library” in volunteer UI |
| Destroy | Archive requires confirm + consequence sentence |
| Publish parity | Contextual photo replace must use the **same** Current→Change→Preview→Make live gate as copy (today Home/About image upload publishes immediately — forbidden under V2) |
| Choose existing | Surfaces that assign photos should support “upload new” **and** “use library photo” consistently |

---

## 7. Responsive preview strategy

Stop asking one scaled desktop canvas to be both thumbnail and proof.

| Mode | Purpose | Implementation direction |
| --- | --- | --- |
| **A Orientation thumbnail** | “Which section is this?” | Small, intentionally non-legible OK; labeled “Thumbnail only” |
| **B Readable preview** | Proof before Make live | Device frames (390 / 768 / 1280) via iframe or container, **or** true public route draft preview |
| Never | Scale 960px public CSS into 320px card and call it mobile QA | Forbidden as the only preview |

Public CSS that keys off `100vw` must not be the sole Hub proof surface unless previewed in a real viewport/iframe.

---

## 8. Typography floors (computed, not class-name theater)

| Role | Minimum computed `font-size` |
| --- | ---: |
| Body, instructions, labels, buttons, field text, navigation | **16px** |
| Help / hints | **15px** |
| Secondary metadata / badges only | **14px** |

CI should assert computed styles on Hub chrome (exclude marked preview canvases).

---

## 9. Program date / schedule patterns

Volunteer picks a **pattern** first:

1. **One day** (start + optional end time)  
2. **Date range** (convention spanning days, single daily blurb)  
3. **Multi-session** (days × session start/end) — required for real conventions  

Rules:

- Unknown end → explicit **TBA / no end time** control (not an empty confusing field).  
- Timezone display is product-owned (show “Africa/Lagos” or church-local wording).  
- Homepage feature is a **separate** step after the program exists.

---

## 10. Current → Change → Preview → Make Live

Mandatory lifecycle for anything that can alter public HTML:

1. **Current** (live) clearly labeled  
2. **Change** creates a proposal (local or draft row)  
3. **Preview** required before enablement of Make live  
4. **Make live** is the only publish verb for that task  

Exceptions (livestream on/off) must use equally plain language and confirm.

---

## 11. Contextual help

| Rule | Detail |
| --- | --- |
| Help answers “what happens if I click this?” | One short sentence |
| No jargon | Avoid placement enums, payload, document_key, AAL |
| Tour | Short + contextual (see §12) |

---

## 12. Tutorial architecture

**Retire** one cross-route mega-tour as the default.

Preferred:

| Layer | Content |
| --- | --- |
| **A** | Dashboard orientation (≤4 steps, same route) |
| **B** | First visit to Homepage editor / Programs / Livestream starts a **page-local** tour |

Hard rules from audit:

- Closing or advancing a step must **close** mobile nav dialog.  
- Tour must not open modal UI that intercepts its own Next/Previous.  
- Escape = pause/dismiss with confirm if mid-edit simulation.  
- After any `router.push`, **re-run target measurement when the destination route mounts** (effect must depend on pathname / ready signal — not only step index).  
- Prefer same-route tours; if cross-route, wait for target presence before enabling Next.  
- Avoid duplicate `data-tour` targets (mobile menu + desktop aside both exposing `help-tutorial`).

---

## 13. Error / success language

| Do | Don’t |
| --- | --- |
| “Saved as a draft — not on the website yet.” | “Upsert succeeded” |
| “These changes are now on the website.” | “Published document” |
| “Could not save. Check the highlighted fields.” | Raw Postgres/RLS dumps |

Flash messages stay human; link to the thing just changed when possible.

---

## 14. Touch targets

| Target | Minimum |
| --- | ---: |
| Primary / secondary buttons | **44×44 CSS px** (WCAG 2.2 AA target-size baseline; prefer 44+ project-wide) |
| Inline text links in dense lists | Expand hit area with padding |

---

## 15. Destructive action rules

| Action class | Rule |
| --- | --- |
| Make live | Requires Preview completed this session |
| Remove from website | Confirm with consequence (“Visitors will not see this”) |
| Turn off livestream | Confirm |
| Archive photo | Confirm; show where it is used if known |
| Sign out | No confirm required |

Never place destructive primary buttons adjacent to Save without spacing/role difference.

---

## 16. Consistency checklist (definition of done for Hub screens)

- [ ] One task statement in the header  
- [ ] One parent link with destination name  
- [ ] Current live state visible before edit  
- [ ] Preview path that is actually readable  
- [ ] One primary action  
- [ ] Computed typography floors met  
- [ ] No raw structural URL editing  
- [ ] Contextual media when photo is part of the task  
- [ ] No open mobile menu left behind by help/tour  
- [ ] Success/error copy uses visitor words  

---

## 17. Suggested redesign sequencing (still proposal)

1. Navigation + Back + tour reliability  
2. Preview strategy split (thumbnail vs proof)  
3. Homepage editor task splitting + structural CTA lock  
4. Program schedule patterns + create upload  
5. Typography computed CI  
6. Media library as reuse-only  

---

## 18. Out of scope

Search, D2 Giving ops, Pastoral Hub, full Events/Camp registration — not redefined here beyond keeping Hub IA free of those futures’ jargon.
