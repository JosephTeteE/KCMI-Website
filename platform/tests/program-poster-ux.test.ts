import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  IMAGE_PROCESS_FAILED_MESSAGE,
  normalizeMarketingImage,
  sanitizeImagePipelineError,
} from "@/lib/cms/image-pipeline";
import {
  MARKETING_IMAGE_ACCEPT,
  MARKETING_IMAGE_FORMAT_HELP,
  validateMarketingImage,
} from "@/lib/cms/media-validate";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

async function imageBytes(
  format: "jpeg" | "png" | "webp",
  nameHint: string,
): Promise<{ bytes: Buffer; type: string; name: string }> {
  const pipeline = sharp({
    create: {
      width: 320,
      height: 240,
      channels: 3,
      background: { r: 40, g: 90, b: 160 },
    },
  });
  if (format === "jpeg") {
    return {
      bytes: await pipeline.jpeg({ quality: 85 }).toBuffer(),
      type: "image/jpeg",
      name: nameHint,
    };
  }
  if (format === "png") {
    return {
      bytes: await pipeline.png().toBuffer(),
      type: "image/png",
      name: nameHint,
    };
  }
  return {
    bytes: await pipeline.webp({ quality: 80 }).toBuffer(),
    type: "image/webp",
    name: nameHint,
  };
}

describe("program poster UX copy", () => {
  it("uses volunteer-friendly poster choice labels", () => {
    const form = readSrc("src/components/hub/program-form.tsx");
    expect(form).toContain("Program poster");
    expect(form).toContain(
      "Add a flyer or image for this program. This is optional.",
    );
    expect(form).toContain("Upload a new poster");
    expect(form).toContain("Choose from saved photos");
    expect(form).toContain("Continue without a poster");
    expect(form).toContain("Select poster image");
    expect(form).toContain("MARKETING_IMAGE_FORMAT_HELP");
    expect(form).not.toContain('"No poster"');
    expect(form).not.toContain('"Use saved photo"');
    expect(form).not.toContain('"Upload new photo"');
  });

  it("documents only formats the server pipeline supports", () => {
    expect(MARKETING_IMAGE_ACCEPT).toContain("image/jpeg");
    expect(MARKETING_IMAGE_ACCEPT).toContain("image/png");
    expect(MARKETING_IMAGE_ACCEPT).toContain("image/webp");
    expect(MARKETING_IMAGE_ACCEPT.toLowerCase()).not.toContain("heic");
    expect(MARKETING_IMAGE_FORMAT_HELP).toContain("JPEG");
    expect(MARKETING_IMAGE_FORMAT_HELP).toContain("PNG");
    expect(MARKETING_IMAGE_FORMAT_HELP).toContain("WebP");
    expect(MARKETING_IMAGE_FORMAT_HELP.toLowerCase()).not.toContain("heic");
  });

  it("keeps program fields on poster failure and allows no-poster continue", () => {
    const form = readSrc("src/components/hub/program-form.tsx");
    const actions = readSrc("src/app/admin/programs/actions.ts");
    expect(actions).toContain(
      "return { ok: false as const, error: poster.error }",
    );
    expect(form).toContain("setPosterFile(null)");
    expect(form).toContain('["none", "Continue without a poster"]');
    expect(form).toContain("result.ok === false");
  });

  it("library mode makes selection still required obvious", () => {
    const form = readSrc("src/components/hub/program-form.tsx");
    expect(form).toContain('heading="Select a saved photo"');
    expect(form).toContain(
      "You still need to pick one photo from the list below",
    );
  });
});

describe("marketing image extension and format handling", () => {
  it("accepts uppercase .JPG filenames when MIME and magic bytes are JPEG", async () => {
    const file = await imageBytes("jpeg", "Flyer.JPG");
    const validated = validateMarketingImage({
      type: file.type,
      size: file.bytes.byteLength,
      bytes: file.bytes,
      name: file.name,
    });
    expect(validated.ok).toBe(true);

    const normalized = await normalizeMarketingImage({ bytes: file.bytes });
    expect(normalized.ok).toBe(true);
  });

  it("accepts normal .jpg JPEG", async () => {
    const file = await imageBytes("jpeg", "photo.jpg");
    expect(
      validateMarketingImage({
        type: file.type,
        size: file.bytes.byteLength,
        bytes: file.bytes,
        name: file.name,
      }).ok,
    ).toBe(true);
    expect((await normalizeMarketingImage({ bytes: file.bytes })).ok).toBe(
      true,
    );
  });

  it("accepts PNG and WebP", async () => {
    for (const format of ["png", "webp"] as const) {
      const file = await imageBytes(format, `asset.${format}`);
      expect(
        validateMarketingImage({
          type: file.type,
          size: file.bytes.byteLength,
          bytes: file.bytes,
          name: file.name,
        }).ok,
      ).toBe(true);
      expect((await normalizeMarketingImage({ bytes: file.bytes })).ok).toBe(
        true,
      );
    }
  });

  it("does not reject .jpeg or .webp by extension casing helpers", () => {
    expect(
      validateMarketingImage({
        type: "image/jpeg",
        size: 3,
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
        name: "Shot.JPEG",
      }).ok,
    ).toBe(true);
  });
});

describe("safe image failure messaging and diagnostics", () => {
  it("exposes the volunteer-safe process-failed message", () => {
    expect(IMAGE_PROCESS_FAILED_MESSAGE).toBe(
      "We couldn't process that image. Try another image or continue without a poster.",
    );
    const pipeline = readSrc("src/lib/cms/image-pipeline.ts");
    expect(pipeline).toContain("IMAGE_PROCESS_FAILED_MESSAGE");
    expect(pipeline).not.toContain(
      "The image could not be converted for the website.",
    );
    expect(pipeline).toContain('scope: "image-pipeline"');
    expect(pipeline).toContain("sanitizeImagePipelineError");
  });

  it("sanitizes Sharp-like errors without leaking buffers", () => {
    const sanitized = sanitizeImagePipelineError({
      name: "Error",
      code: "VIPS_ERROR",
      message: "bad pixel\ndata ".repeat(40),
    });
    expect(sanitized.errorName).toBe("Error");
    expect(sanitized.errorCode).toBe("VIPS_ERROR");
    expect(sanitized.errorMessage.length).toBeLessThanOrEqual(300);
    expect(sanitized.errorMessage).not.toContain("\n");
  });
});
