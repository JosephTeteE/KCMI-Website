# KCMI QA Coverage Matrix (QA1)

Independent coverage dimensions — **do not collapse into one “100%” number**.

## Routes

Authoritative inventory: `platform/e2e/qa/manifest.ts`

| Surface | Count (approx) | Notes |
|---------|----------------|-------|
| PUBLIC | 15 | Home, About, Locations, Services, Sermons, Contact, Giving, Livestream, Events, FAQs, legal, Mission |
| AUTH | 2 | Sign-in, MFA |
| HUB | 11+ | Dashboard, Website editors, Programs, Media, Branches, Livestream, Sermons |
| QA_ONLY | 3 | `/qa/*` fixtures — not visitor product routes |

Dynamic routes use known fixtures (e.g. STAGING QA Program id), not blind crawling.

## Workflows

Authoritative registry: `platform/e2e/qa/workflows.ts`

| Workflow | Required | Spec |
|----------|----------|------|
| program-lifecycle | YES | `full-spectrum/program-lifecycle.spec.ts` |
| media-lifecycle | YES | `media-lifecycle.spec.ts` (cancel/safe; Make Live isolated) |
| public-navigation | YES | `public-interactions.spec.ts` + smoke |
| location-finder | YES | public interactions / locations |
| tutorial | YES | `tutorial-workflows.spec.ts` |
| livestream | YES | `livestream-workflows.spec.ts` (no generic Make Live) |

## States

See `QA_STATES` in the manifest (draft Program, published safety fixture, tour open, mobile menu, locations query, livestream idle, …).

## Controls

Runtime discovery in `dom-audit.ts` + heuristic `mutation-policy` classification.

Report: discovered / classified / exercised / unclassified / manifest-missing.

New meaningful unclassified controls should fail **FULL** reconciliation.

## Responsive

- Boundary DOM sweep widths: see `e2e/qa/viewports.ts` (`BOUNDARY_WIDTHS`)
- Interaction widths: 390, 768, 1280, 1920
- Full boundary matrix: `QA_LAYOUT_FULL=1`

## Browsers

| Project | Role |
|---------|------|
| fs-chromium | Primary full |
| fs-firefox / fs-webkit | Critical compatibility |
| fs-mobile-chrome / fs-mobile-webkit | Mobile critical |

Pixel baselines: Chromium only unless separately approved.

## Accessibility

`@axe-core/playwright` on representative public (and Hub when authed) states + custom Hub typography/touch checks.

Automated a11y ≠ complete a11y.

## Visual / Performance

- Visual: unbaselined until human `qa:visual:update`
- Performance: public-only Unlighthouse/Lighthouse — trends until baseline accepted
