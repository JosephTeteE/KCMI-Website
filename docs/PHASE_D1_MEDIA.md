# Phase D1 — Media handling notes

## Bucket

- Supabase Storage bucket: `marketing-public` (public read)
- MIME allowlist for **stored** objects: `image/jpeg`, `image/png`, `image/webp`
- New Hub uploads are **always stored as WebP** after server-side normalization
- Source upload limit: **15 MB** (JPEG / PNG / WebP only)
- Stored object limit: **5 MB** (`media_assets.byte_size` check + bucket `file_size_limit`)
- SVG and video rejected (no ordinary video uploads to Storage)

## Upload path

1. Hub form (`MarketingImageUploader`) posts to a server action
2. Server requires AAL2 + `media.manage` (or branch-scoped `branches.manage` / `can_manage_branch` for branch photos)
3. Magic-byte MIME detection (`media-validate.ts`) must match declared type
4. **Sharp** decodes the image (proves it is a real JPEG/PNG/WebP), auto-orients, strips EXIF/GPS/camera metadata
5. Optional focal-point crop to hero 16:9, card 4:3, square 1:1, or original ratio
6. Longest edge resized to **1920 px** (never enlarged)
7. WebP encoded at quality **82** (falls back to 74 then 66 if still over 5 MB)
8. Object key is a randomized UUID `.webp` path (original filename is not the storage key)
9. Row inserted into `media_assets` with alt text (required), optional caption, `width_px` / `height_px`, stored byte size
10. Audit event recorded
11. Storage writes use the **service-role** server client after authorization; JWT roles cannot insert/update/delete objects

## Public delivery / optimization

- Public site uses `media_assets.public_url` through content adapters
- Next.js `<Image>` still optimizes delivery; Hub no longer stores giant camera originals
- Next.js server action body limit is **16 MB** so large source photos can reach the pipeline

## Video policy

- Do **not** upload sermon or livestream video files to Supabase Storage
- Sermons: validated YouTube watch / Shorts URLs
- Livestream: validated Facebook page or video URLs (embed HTML is stripped to a URL)

## Dependency: `sharp`

- **Chosen because:** maintained Node image library already used by Next.js; local CPU processing; no paid image CDN; supports rotate/EXIF strip, extract, resize, and WebP encode
- Runtime dependency of the Hub server (not a client bundle)
- Do not introduce Cloudinary, imgix, or other paid image services for this pipeline

## Deletion

- Prefer soft archive (`archived_at`)
- Archive blocked when asset is referenced by published programs/sermons or active published branch media
