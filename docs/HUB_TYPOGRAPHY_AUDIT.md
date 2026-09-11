# KCMI Hub — Typography Audit (computed styles)

**Status:** AUDIT ONLY (2026-09-11)  
**Method:** Playwright `getComputedStyle` on Hub routes at 390 / 768 / 1280 / 1920 / 2560  
**Auth:** staging HQ Content Admin storageState (gitignored)  
**Evidence:** `platform/.qa-hub-product-audit/audit-results.json` · typography screenshots in ZIP

Floors used (project intent):

| Role | Floor |
| --- | ---: |
| Body / instructions / labels / buttons / fields / nav | **16px** |
| Help / hints | **15px** |
| Secondary metadata / badges | **14px** |

---

## Summary

| Metric | Count |
| --- | ---: |
| Violation rows (deduped samples) | **151** |
| Computed **&lt; 14px** | **0** |
| Computed **14px** failing 15–16 floors | **151** |
| Severe unreadable (&lt;12px) in Hub chrome | **0 observed** |
| Primary failure mode | `text-sm` (14px) Hub chrome **and** scaled public preview content measured as Hub DOM text |

No sub-14px Hub chrome found in this pass. Failures cluster at **exactly 14px**.

---

## Severity bands

### P1 — Volunteer-facing Hub chrome below 16px (fix in redesign)

These are real Hub UI strings (not only scaled previews):

| Route | Viewport samples | Text sample | Role | px | Floor |
| --- | --- | --- | ---: | ---: | ---: |
| `/admin/website/home` | 390, 768, … | `← Website pages` | nav/link | 14 | 16 |
| `/admin/programs` | 390+ | `New program` | nav/link | 14 | 16 |
| `/admin/programs/new` | 390+ | `← All programs` | nav/link | 14 | 16 |
| `/admin/media` | 390+ | `Image file *` | label | 14 | 16 |
| `/admin/media` | 390+ | `JPEG, PNG, or WebP up to 15MB…` | body | 14 | 16 |
| `/admin/media` | 390+ | Aspect radio labels (`Wide photo…`) | label | 14 | 16 |
| `/admin/media` | 390+ | `Check how the photo will look` | button | 14 | 16 |
| `/admin/livestream` | 390+ | `Start a Facebook livestream` | button | 14 | 16 |
| `/admin/livestream` | 390+ | `Currently on the website` | heading/meta | 14 | 14–16 borderline |

**Cause:** `HubPageHeader` Back link uses `text-sm`; some uploader/livestream strings still resolve to 14px despite broader D1.7 typography pass.

### P2 — Preview-canvas text measured under floors (expected with current preview strategy)

On `/admin/website/home` (and similar editors), public section text inside `HubPreviewFrame` is laid out at **960px** then **CSS-scaled** into a narrow card. Computed font size of those nodes falls to **14px** at 390/768 even when source classes are larger.

Examples:

| Text sample | Role | px | Note |
| --- | --- | ---: | --- |
| `Plan a Visit` / `Watch Live` | preview links | 14 | Scaled hero CTAs |
| Welcome body sentence | preview body | 14 | Scaled Discover copy |
| `Submit Prayer Request` / `Give Now` | preview links | 14 | Scaled Prayer & Giving |

**These are not fixed by bumping Hub `text-base` alone** — they require a preview strategy change (see Design Standard V2).

### P3 — Acceptable 14px metadata (if clearly secondary)

Status chips / “Currently on the website” captions may legitimately sit at 14px **if** never used as the only instruction for a primary task. Today captions sit beside titles and are easy to confuse with instructions → treat as **NEEDS IMPROVEMENT** until hierarchy is clearer.

---

## Viewport notes

| Viewport | Observation |
| --- | --- |
| 390 | Most P1/P2 hits; mobile menu + tour conflict also at this width |
| 768 | Same 14px Hub Back links; preview still scaled |
| 1280 | Hub chrome still 14px on Back links; preview scale closer to 1 on wide cards but still not device-true |
| 1920 / 2560 | Same class-driven 14px chrome; preview often unscaled (scale≈1) so preview text closer to public desktop |

---

## Meaningfully unreadable?

| Area | Verdict |
| --- | --- |
| Hub forms at 1280+ | Mostly readable; Back/help chrome slightly small |
| Hub forms at 390 | Usable but dense; 14px labels strain |
| In-card previews at 390 | **Effectively unreadable as proof** — orientation thumbnail only |
| Full-size preview modal | Readable desktop approximation; not true mobile |

---

## Recommendations (audit only)

1. Enforce **computed** floors in CI for Hub chrome selectors (exclude `[data-preview-canvas]`).
2. Stop measuring success by Tailwind class names alone.
3. Split preview modes: thumbnail vs device iframe/container queries.
4. Rename/relabel captions so 14px metadata is never the primary instruction.

Raw JSON rows: `.qa-hub-product-audit/audit-results.json` → `typographyViolations`.

---

## D1.8 remediation status

| Metric | Value |
| --- | --- |
| Before (audit) | **151** computed 14px hits; **0** &lt;14px |
| After (full Playwright recomputation) | **NOT RE-RUN** in this evidence pack |
| Code mitigations | Hub Back → `text-base`; `.hub-chrome` floors `.text-sm` outside `[data-hub-preview-scaled]` to ≥16px; `.hub-help` = 15px; `.hub-meta` may be 14px |
| Justified exceptions | Scaled public section thumbnails (Preview Mode A); true metadata badges |

Re-run computed-style audit at 390 / 768 / 1280 / 1920 / 2560 against Hub chrome selectors excluding `[data-hub-preview-scaled] *` before declaring after-count closed.
