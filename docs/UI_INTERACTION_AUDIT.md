# KCMI UI interaction audit (D1.6A)

**Date:** 2026-09-08  
**Surfaces:** public site layout/header/footer/pages; Hub nav, forms, media uploader, auth; live staging `https://kcmi-website-seven.vercel.app`.

## Requirements checked

1. Genuine controls use `<a>`, `<button>`, or form controls — not clickable `<div>`s.
2. Pointer cursor only on interactive elements.
3. Hover, `:focus-visible`, and disabled states.
4. Destructive actions visually distinct.
5. Keyboard: native controls remain operable.

## Central rule (implemented)

`platform/src/styles/tokens.css` now sets:

- `cursor: pointer` on `a[href]`, enabled buttons/file/select/summary/`label[for]`/checkbox and radio labels
- `cursor: not-allowed` + reduced opacity on disabled buttons/inputs
- hover brightness on enabled buttons
- existing global `:focus-visible` outline (3px brand focus)

This is the default affordance. Components should not add `cursor-pointer` on noninteractive wrappers.

## Public website

| Control | Markup | Pointer/hover/focus before | After / notes |
|---|---|---|---|
| Skip link | `<a href="#main-content">` | sr-only until focus | Unchanged; focus styles already strong |
| Logo home | `<Link>` | hover via nav colors | Cursor from central rule |
| Primary nav | `<Link>` | hover bg/text | Cursor from central rule |
| Watch Live CTA | `<Link>` | solid button, little hover | Button hover brightness does not apply (it's an `<a>`). Acceptable; cursor now pointer |
| Mobile menu | `<button>` | present | Cursor + button hover |
| Footer / social / legal | `<a>` / `<Link>` | underline on hover | Cursor from central rule |
| Branch tel/mailto/maps | `<a>` | color hover | Cursor from central rule |
| Home/sermons/livestream CTAs | `<Link>` / `<a>` | mixed | Cursor from central rule |
| Events placeholders | no extra controls | n/a | n/a |

No public clickable `<div onClick>` found. Cards on `/locations` are **not** links (no branch page yet) — they are not fake buttons.

## Hub / auth

| Control | Markup | Issue | Fix |
|---|---|---|---|
| Sign in submit | `<button type="submit">` | short hit target | `min-h-11`; disabled opacity already |
| Sign out (Hub nav) | `<button type="submit">` | text-only; easy to miss | Destructive color + hover wash + underline; central cursor |
| Sign out (access denied) | `<button>` | same | Matched Hub nav treatment |
| Hub nav links | `<Link>` | hover bg only | + `focus-visible` bg |
| Events/Pastoral/Giving | `<span>` | correctly noninteractive | `cursor-not-allowed` already |
| HubSubmitButton | `<button type="submit">` | no hover | Central button hover; danger/secondary variants already distinct |
| Archive/remove | `HubSubmitButton variant="secondary"` | red-ish secondary vs true `danger` | Remaining: prefer `danger` for irreversible archive where copy says archive — **not changed** this pass (behavior unchanged) |
| Crop radios | `<label>` + radio | cursor-pointer already | Covered by `:has(input[type=radio])` |
| Focal point | `<button type="button">` | semantic | Unchanged |
| Prepare website version | `<button type="button" disabled>` | disabled opacity | Central disabled cursor |
| File input | `<input type="file">` | native | Central pointer |

## Keyboard

Native `<a>`, `<button>`, inputs, and selects remain tabbable. Focal-point control is a button (Enter/Space). Mobile nav is a button with `aria-expanded`. No new `div` click handlers added.

## Remaining gaps (not fixed this pass)

- Solid filled `<a>` CTAs do not dim on hover the way `<button>`s do (cursor only). Optional later: shared `.ui-cta` class.
- Program/sermon **Archive** still uses `secondary` (brand red) rather than `danger` in some forms — verify per screen.
- Locations cards are not keyboard-activatable as navigation because `/locations/[slug]` does not exist.
- CSP report-only still logs Next.js inline scripts on staging (not an interaction bug).

## Files touched for affordance

- `platform/src/styles/tokens.css`
- `platform/src/components/layout/hub-nav.tsx`
- `platform/src/components/hub/hub-form-fields.tsx`
- `platform/src/app/admin/layout.tsx`
- `platform/src/components/auth/sign-in-form.tsx`
