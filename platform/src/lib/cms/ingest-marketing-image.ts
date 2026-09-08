import { validateMarketingImage } from "@/lib/cms/media-validate";
import { normalizeMarketingImage } from "@/lib/cms/image-pipeline";
import type { NormalizedMarketingImage } from "@/lib/cms/image-pipeline";

export type IngestMarketingImageResult =
  | {
      ok: true;
      originalName: string;
      sourceBytes: number;
      image: NormalizedMarketingImage;
    }
  | { ok: false; error: string };

export async function ingestMarketingImageFile(
  file: File,
  formData: FormData,
): Promise<IngestMarketingImageResult> {
  const originalName = file.name || "upload";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateMarketingImage({
    type: file.type,
    size: file.size,
    bytes,
    name: originalName,
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const normalized = await normalizeMarketingImage({
    bytes,
    cropAspect: formData.get("crop_aspect"),
    focalX: formData.get("focal_x"),
    focalY: formData.get("focal_y"),
  });
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  return {
    ok: true,
    originalName: originalName.slice(0, 255),
    sourceBytes: file.size,
    image: normalized.image,
  };
}

export function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}
