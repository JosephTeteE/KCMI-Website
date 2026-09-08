# Phase D1.1 notes

## Docker / local Supabase

Realtime, Studio, imgproxy, and analytics containers may report **unhealthy** on this host.

Required for D1.1 workflows:

- Postgres
- Auth (GoTrue)
- PostgREST
- Storage API (for image upload proofs)

When CLI health checks fail on unrelated services, start with:

```bash
npx supabase start --ignore-health-check
```

Do **not** use that flag to ignore Auth or Storage failures that block Hub media uploads.

## Workflow validation

```bash
npm run build && npm run start -- -p 3000
npm run validate:d11
```

Synthetic users only (`*.example.invalid`).
