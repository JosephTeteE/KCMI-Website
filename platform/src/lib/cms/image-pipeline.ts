import sharp from "sharp";
import {
  parseCropAspect,
  parseFocalPoint,
  ratioForCrop,
  cropRectForAspect,
  type CropAspectId,
  type FocalPoint,
} from "@/lib/cms/image-crop";
import { detectImageMimeFromMagicBytes } from "@/lib/cms/media-validate";

type SharpInstance = ReturnType<typeof sharp>;

/** Longest edge after crop. Covers ~1280 CSS px at 1.5× without huge files. */
export const MAX_OUTPUT_EDGE_PX = 1920;

/** WebP quality in the low/mid-80s — practical size vs visible quality. */
export const WEBP_QUALITY = 82;

/** Stored object must still fit the media_assets byte_size check. */
export const MAX_STORED_IMAGE_BYTES = 5 * 1024 * 1024;

/** Guard against decompression bombs before decode. */
const MAX_INPUT_PIXELS = 40_000_000;

export const IMAGE_PROCESS_FAILED_MESSAGE =
  "We couldn't process that image. Try another image or continue without a poster.";

export type NormalizedMarketingImage = {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
  sourceWidth: number;
  sourceHeight: number;
  cropAspect: CropAspectId;
  focal: FocalPoint;
};

export type NormalizeImageResult =
  | { ok: true; image: NormalizedMarketingImage }
  | { ok: false; error: string };

export type NormalizeImageInput = {
  bytes: Uint8Array;
  cropAspect?: unknown;
  focalX?: unknown;
  focalY?: unknown;
};

type SafeImagePipelineLog = {
  operation: string;
  detectedMime: string | null;
  byteSize: number;
  widthPx?: number;
  heightPx?: number;
  errorName?: string;
  errorCode?: string;
  errorMessage: string;
};

/** Sanitize Sharp/libvips errors for server logs — never log bytes or PII. */
export function sanitizeImagePipelineError(err: unknown): {
  errorName?: string;
  errorCode?: string;
  errorMessage: string;
} {
  if (err && typeof err === "object") {
    const record = err as {
      name?: unknown;
      code?: unknown;
      message?: unknown;
    };
    return {
      errorName:
        typeof record.name === "string"
          ? record.name.slice(0, 80)
          : undefined,
      errorCode:
        record.code != null ? String(record.code).slice(0, 40) : undefined,
      errorMessage:
        typeof record.message === "string"
          ? record.message.replace(/\s+/g, " ").slice(0, 300)
          : "unknown",
    };
  }
  return { errorMessage: "unknown" };
}

function logImagePipelineFailure(entry: SafeImagePipelineLog): void {
  console.info(
    JSON.stringify({
      level: "warn",
      scope: "image-pipeline",
      ...entry,
    }),
  );
}

export async function normalizeMarketingImage(
  input: NormalizeImageInput,
): Promise<NormalizeImageResult> {
  const cropAspect = parseCropAspect(input.cropAspect);
  const focal = parseFocalPoint(input.focalX, input.focalY);
  const detectedMime = detectImageMimeFromMagicBytes(input.bytes);
  const byteSize = input.bytes.byteLength;

  let oriented: SharpInstance;
  try {
    oriented = sharp(input.bytes, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();
  } catch (err) {
    logImagePipelineFailure({
      operation: "sharp.open",
      detectedMime,
      byteSize,
      ...sanitizeImagePipelineError(err),
    });
    return {
      ok: false,
      error: "The file could not be read as a JPEG, PNG, or WebP image.",
    };
  }

  let sourceWidth: number;
  let sourceHeight: number;
  try {
    const meta = await oriented.metadata();
    if (!meta.width || !meta.height) {
      return {
        ok: false,
        error: "The image has no usable dimensions.",
      };
    }
    sourceWidth = meta.width;
    sourceHeight = meta.height;
  } catch (err) {
    logImagePipelineFailure({
      operation: "sharp.metadata",
      detectedMime,
      byteSize,
      ...sanitizeImagePipelineError(err),
    });
    return {
      ok: false,
      error: "The file could not be decoded as a real image.",
    };
  }

  const ratio = ratioForCrop(cropAspect);
  let pipeline = oriented.clone();
  if (ratio) {
    const rect = cropRectForAspect(sourceWidth, sourceHeight, ratio, focal);
    pipeline = pipeline.extract(rect);
  }

  const encoded = await encodeWebp(pipeline, {
    detectedMime,
    byteSize,
    sourceWidth,
    sourceHeight,
  });
  if (!encoded.ok) return encoded;

  return {
    ok: true,
    image: {
      buffer: encoded.buffer,
      contentType: "image/webp",
      width: encoded.width,
      height: encoded.height,
      byteSize: encoded.buffer.byteLength,
      sourceWidth,
      sourceHeight,
      cropAspect,
      focal,
    },
  };
}

async function encodeWebp(
  pipeline: SharpInstance,
  context: {
    detectedMime: string | null;
    byteSize: number;
    sourceWidth: number;
    sourceHeight: number;
  },
): Promise<
  | { ok: true; buffer: Buffer; width: number; height: number }
  | { ok: false; error: string }
> {
  const qualities = [WEBP_QUALITY, 74, 66];

  try {
    for (const quality of qualities) {
      const { data, info } = await pipeline
        .clone()
        .resize({
          width: MAX_OUTPUT_EDGE_PX,
          height: MAX_OUTPUT_EDGE_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      if (data.byteLength <= MAX_STORED_IMAGE_BYTES) {
        return {
          ok: true,
          buffer: data,
          width: info.width,
          height: info.height,
        };
      }
    }
  } catch (err) {
    logImagePipelineFailure({
      operation: "encodeWebp",
      detectedMime: context.detectedMime,
      byteSize: context.byteSize,
      widthPx: context.sourceWidth,
      heightPx: context.sourceHeight,
      ...sanitizeImagePipelineError(err),
    });
    return {
      ok: false,
      error: IMAGE_PROCESS_FAILED_MESSAGE,
    };
  }

  return {
    ok: false,
    error: "The optimized image is still too large to store. Try a smaller crop.",
  };
}
