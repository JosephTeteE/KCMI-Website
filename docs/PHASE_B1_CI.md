# Phase B.1 — CI limitation (database / Auth)

**Status:** Documented limitation (no brittle CI added)  
**Date:** 2026-09-07

## Decision

Do **not** add Supabase Docker + `supabase test db` + Auth/MFA E2E to `.github/workflows/platform-ci.yml` in Phase B.1.

## Why

- Local stack requires Docker image pulls (multi‑GB) and multi‑minute startup on cold runners.
- Auth/MFA validation needs a running Next server plus local keys (`.env.local`), which is awkward and fragile in PR CI without secrets/service containers carefully staged.
- Analytics/vector services are already flaky on Docker Desktop; CI would need the same exclusions and still risk flaky health checks.

## What CI does run

`platform-ci.yml`: `npm ci` → lint → typecheck → unit tests → production build.

## Required local verification for authz/MFA changes

```bash
cd platform
npm run db:start
npm run db:reset
npm run db:test
npm run build && npm run start   # separate terminal
npm run validate:b1
```

A future ADR may add a dedicated `platform-supabase-ci` job once runner cost and flake risk are acceptable.
