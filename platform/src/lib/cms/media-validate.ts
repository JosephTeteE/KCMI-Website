export const MAX_MARKETING_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB source upload

export const ALLOWED_MARKETING_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMarketingImageMime =
  (typeof ALLOWED_MARKETING_IMAGE_MIMES)[number];

export type MediaValidateResult =
  | { ok: true; contentType: AllowedMarketingImageMime }
  | { ok: false; error: string };

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
  ".m4v",
  ".mpeg",
  ".mpg",
  ".ogv",
  ".3gp",
];

/**
 * Detect image MIME from file signatures (magic bytes).
 * Returns null when the buffer is not a recognized JPEG/PNG/WebP.
 */
export function detectImageMimeFromMagicBytes(
  buf: Uint8Array,
): AllowedMarketingImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }

  // RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function looksLikeVideoUpload(file: {
  type?: string;
  name?: string;
}): boolean {
  const declared = (file.type ?? "").toLowerCase();
  if (declared.startsWith("video/")) return true;

  const name = (file.name ?? "").toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function looksLikeSvgUpload(file: {
  type?: string;
  name?: string;
}): boolean {
  const declared = (file.type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  return declared === "image/svg+xml" || name.endsWith(".svg");
}

export function validateMarketingImage(file: {
  type: string;
  size: number;
  bytes: Uint8Array;
  name?: string;
}): MediaValidateResult {
  if (looksLikeSvgUpload(file)) {
    return { ok: false, error: "SVG images are not allowed." };
  }
  if (looksLikeVideoUpload(file)) {
    return {
      ok: false,
      error:
        "Video files cannot be uploaded. Use a YouTube URL for sermons or a Facebook URL for livestream.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: "Image file is empty." };
  }
  if (file.size > MAX_MARKETING_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 15MB or smaller." };
  }

  const declared = file.type.toLowerCase();
  if (
    !(ALLOWED_MARKETING_IMAGE_MIMES as readonly string[]).includes(declared)
  ) {
    return {
      ok: false,
      error: "Only JPEG, PNG, and WebP images are allowed.",
    };
  }

  const detected = detectImageMimeFromMagicBytes(file.bytes);
  if (!detected) {
    return {
      ok: false,
      error: "File contents are not a valid JPEG, PNG, or WebP image.",
    };
  }

  if (detected !== declared) {
    return {
      ok: false,
      error: "Declared content type does not match file contents.",
    };
  }

  return { ok: true, contentType: detected };
}
