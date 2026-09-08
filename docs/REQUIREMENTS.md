# KCMI Digital Platform — Requirements

**Status:** Aligned to ACCEPTED ADRs (2026-09-07); remaining gaps labeled  
**Evidence labels:** VERIFIED CURRENT STATE | ACCEPTED | PROPOSED | DECISION REQUIRED | EXTERNAL VERIFICATION REQUIRED

---

## 1. Public website capabilities

| Requirement | Origin | Label |
|-------------|--------|-------|
| Home, locations, services, contact, giving, livestream, sermons, mission, about pastor, FAQs, privacy, terms | Legacy `public/*.html` | VERIFIED CURRENT STATE (pages exist); PROPOSED (rebuild equivalents) |
| Preserve important public URLs / redirects (incl. camp → events host evolution) | `vercel.json`, inventory | VERIFIED CURRENT STATE + PROPOSED migration |
| Giving account information displayed accurately | `giving-kcmi.html` | VERIFIED CURRENT STATE; dual-approval for destination edits ACCEPTED (ADR-0006) |
| Facebook livestream URL + live indicator managed by staff | admin + `/api/livestream` (legacy HTML embed) | VERIFIED CURRENT STATE (weak auth); ACCEPTED Facebook URL model (ADR-0007) |
| Promotions / programs / announcements without Google Sheets dependency long-term | Sheets-backed promos today | VERIFIED CURRENT STATE; ACCEPTED Hub-managed structured content direction |
| Calendar / maps support as needed | calendar + maps proxy today | VERIFIED CURRENT STATE; PROPOSED re-evaluate in Hub/public |

## 2. Forms and pastoral workflows

| Workflow | Today | Rebuild |
|----------|-------|---------|
| Counselling, Welfare, Prayer, Celebrations, First-Timers, Fellowships, Service Teams | Google Forms links | EXTERNAL VERIFICATION REQUIRED (field schemas); ACCEPTED gradual first-party forms (ADR-0005); pastoral separation ACCEPTED (ADR-0003) |
| Contact form | Native + email | VERIFIED CURRENT STATE; PROPOSED Hub/inbox or Resend-backed mail with Turnstile |
| Daily Faith Recharge (Spotify + WhatsApp gate) | Footer modal + `/subscribe` | VERIFIED CURRENT STATE; PROPOSED retain capability with privacy-safe notifications |
| Camp registration + payment receipt | Camp subdomain + Cloudinary public URLs | VERIFIED CURRENT STATE; ACCEPTED events host + private image evidence (ADR-0002, ADR-0004) |

## 3. KCMI Hub (non-technical operations)

Subject to architectural review and ADR acceptance, Hub SHALL allow authorized staff to:

- create/edit/schedule/archive programs and announcements;
- upload flyers and promotional media;
- choose banner / homepage card / promotional modal placement;
- preview before publishing;
- manage sermons via structured metadata + YouTube URLs;
- manage branch information, addresses, schedules, contacts;
- manage reusable event landing pages and registrations;
- review payment evidence via protected storage;
- process First-Timer, Fellowship, Service-Team submissions;
- process Prayer, Counselling, Welfare with **strictly separated** permissions;
- assign pastoral cases to authorized pastors;
- maintain audit trails for sensitive administrative actions.

**PROPOSED:** Not every page field is Hub-editable; see architecture content-control matrix.

## 4. Events platform

| Requirement | Label |
|-------------|-------|
| Replace disposable camp-only architecture with reusable events | ACCEPTED |
| Publish/archive events with per-event landing experience | ACCEPTED |
| Hostname `events.kcmi-rcc.org` via next.config host rewrites; real `/events` routes | ACCEPTED (ADR-0002) |
| Preserve `camp.kcmi-rcc.org` as vanity redirect to applicable camp event | ACCEPTED (ADR-0002) |

## 5. Non-functional requirements

| Area | Requirement | Label |
|------|-------------|-------|
| Security | ASVS 5.0 Level 2; MFA for all Hub staff; AAL2 for high-impact actions | ACCEPTED |
| Privacy | Pastoral/media separation; private image receipts; retention defaults | ACCEPTED |
| Accessibility | WCAG 2.2 AA | ACCEPTED |
| Performance | Image-first; explicit budgets (LCP/INP/CLS/transfer) | PROPOSED numeric budgets |
| Maintainability | Church-owned services; Hub ops without source edits | ACCEPTED direction |
| AI | Draft-assist only; human publish; no default pastoral access | ACCEPTED |

## 6. Explicit non-requirements (V1)

- Custom password storage.
- Prisma (unless later ADR).
- Cloudflare R2 (unless later ADR).
- Experimental passkeys as V1 MFA foundation.
- PDF payment evidence; separate malware-scanning vendor (ADR-0004).
- reCAPTCHA in the new architecture (Turnstile ACCEPTED).
- AI beyond draft-assist without new ADR.
- Hub-editable Privacy/Terms bodies (code-controlled in V1).
