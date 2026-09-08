# ADR-0001: Target stack and hosting

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

The legacy platform mixes static HTML, Express on Render, MySQL, Google Sheets/Drive/Calendar, Cloudinary, and a camp submodule (**VERIFIED CURRENT STATE** per Phase 0 inventory). The rebuild needs a maintainable V1 stack with fewer moving parts and church-operable Hub workflows.

## Decision

V1 target stack:

- Next.js (current stable) App Router
- TypeScript strict
- Current Tailwind CSS with centralized primitive + semantic design tokens
- Supabase PostgreSQL, Auth, RLS, Storage
- Resend for transactional email (prefer sending subdomain such as `mail.kcmi-rcc.org`; exact DNS later)
- Cloudflare DNS/edge and Turnstile
- Vercel deployment
- YouTube for **sermon** video (not livestream)
- Facebook for **livestream** presentation (see ADR-0007)
- No Prisma initially
- No Cloudflare R2 initially (reconsider later only with demonstrated public-media scale/cost need)
- Observability: platform-native Vercel / Supabase / Cloudflare logging plus uptime checks; no third-party APM in V1 unless native proves insufficient
- HSTS once HTTPS topology is confirmed; **do not** enable HSTS preload initially
- Security verification target: OWASP ASVS 5.0 Level 2 (selective stronger controls as warranted); WCAG 2.2 AA; NIST SSDF-aligned practices

Do not alter the organization’s existing human-email MX when configuring Resend on a dedicated sending subdomain.

## Consequences

- Phase B foundation may assume this stack once build work is explicitly authorized.
- R2, Prisma, third-party APM, and HSTS preload require new ADRs if introduced.
- Exact DNS records and provider project IDs remain EXTERNAL VERIFICATION REQUIRED at provisioning.

## Alternatives considered

- Retain Express + MySQL + Cloudinary — rejected for Hub/RLS/maintainability goals.
- Prisma ORM — deferred; SQL migrations + Supabase client preferred unless compelling need.
- Cloudflare R2 for all media — deferred.

## Security / privacy notes

- Service-role and secrets remain server-only.
- Observability must never receive pastoral narratives, payment evidence, or credentials.

## References

- [ARCHITECTURE_V1_DRAFT.md](../ARCHITECTURE_V1_DRAFT.md)
- ADR-0005 (Turnstile), ADR-0007 (livestream Facebook), ADR-0004 (Storage)
