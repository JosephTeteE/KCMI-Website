# KCMI Platform (Phase B / B.1 / C1)

Isolated Next.js application for the KCMI Digital Platform rebuild.

See [`docs/ARCHITECTURE_V1.md`](../docs/ARCHITECTURE_V1.md).

## Phase C1 (public shell + homepage)

- Homepage at `/` with image-first hero (no legacy multi‑MB video)
- Typed content adapters under `src/content/`
- Global header/footer, SEO (`robots`, `sitemap`), legacy `.html` redirects
- Run: `npm run dev` → http://127.0.0.1:3000/

## Commands

```bash
npm install
cp .env.example .env.local   # fill from `npx supabase status -o env` for Hub
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
npm run test:visual
npm run test:ui
npm run dev
```

Playwright uses the installed **Google Chrome** channel (`channel: "chrome"`). Bundled Chromium is unsupported on older Intel macOS 13. See [`docs/PHASE_D1_2.md`](../docs/PHASE_D1_2.md). Visual baselines are never auto-blessed — update snapshots only with `--update-snapshots` after review.

## Local Supabase (Hub)

```bash
npm run db:start && npm run db:reset && npm run db:test
```

Never commit `.env.local`. No production deploy without separate authorization.

## Notes

- Session refresh: `src/proxy.ts`
- Legacy `public/`, `server/`, `api/`, `camp-deploy/` remain untouched reference sources
