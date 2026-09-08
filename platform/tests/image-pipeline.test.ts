import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { cropRectForAspect, parseCropAspect } from "@/lib/cms/image-crop";
import {
  MAX_OUTPUT_EDGE_PX,
  normalizeMarketingImage,
} from "@/lib/cms/image-pipeline";
import {
  MAX_MARKETING_IMAGE_BYTES,
  looksLikeSvgUpload,
  looksLikeVideoUpload,
  validateMarketingImage,
} from "@/lib/cms/media-validate";

async function jpegBytes(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 40, b: 40 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

describe("crop aspect helpers", () => {
  it("parses known crop ids and falls back to original", () => {
    expect(parseCropAspect("hero")).toBe("hero");
    expect(parseCropAspect("mystery")).toBe("original");
  });

  it("crops 16:9 around a right-side focal point", () => {
    const rect = cropRectForAspect(1600, 900, 16 / 9, { x: 1, y: 0.5 });
    expect(rect.height).toBe(900);
    expect(rect.width).toBe(1600);
    expect(rect.left).toBe(0);
  });

  it("crops a tall image to square using the focal point", () => {
    const rect = cropRectForAspect(1000, 2000, 1, { x: 0.5, y: 0 });
    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(1000);
    expect(rect.top).toBe(0);
    expect(rect.left).toBe(0);
  });
});

describe("marketing image validation", () => {
  it("rejects video filenames and MIME types", () => {
    expect(looksLikeVideoUpload({ type: "video/mp4", name: "clip.mp4" })).toBe(
      true,
    );
    expect(
      validateMarketingImage({
        type: "video/mp4",
        size: 12,
        name: "clip.mp4",
        bytes: new Uint8Array([0, 1, 2]),
      }).ok,
    ).toBe(false);
  });

  it("rejects SVG", () => {
    expect(looksLikeSvgUpload({ type: "image/svg+xml", name: "logo.svg" })).toBe(
      true,
    );
    expect(
      validateMarketingImage({
        type: "image/svg+xml",
        size: 12,
        name: "logo.svg",
        bytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
      }).ok,
    ).toBe(false);
  });

  it("still enforces the 15MB source ceiling", () => {
    expect(
      validateMarketingImage({
        type: "image/jpeg",
        size: MAX_MARKETING_IMAGE_BYTES + 1,
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      }).ok,
    ).toBe(false);
  });
});

describe("normalizeMarketingImage", () => {
  it("decodes, strips metadata, resizes, and emits WebP", async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 120, g: 40, b: 160 },
      },
    })
      .jpeg({ quality: 92 })
      .withMetadata({
        exif: {
          IFD0: { Copyright: "test-copyright", Make: "TestCam" },
        },
      })
      .toBuffer();

    const result = await normalizeMarketingImage({
      bytes: source,
      cropAspect: "hero",
      focalX: "0.5",
      focalY: "0.5",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.image.contentType).toBe("image/webp");
    expect(result.image.width).toBeLessThanOrEqual(MAX_OUTPUT_EDGE_PX);
    expect(result.image.height).toBeLessThanOrEqual(MAX_OUTPUT_EDGE_PX);
    expect(result.image.width / result.image.height).toBeCloseTo(16 / 9, 2);
    expect(result.image.sourceWidth).toBe(2400);
    expect(result.image.sourceHeight).toBe(1600);

    const outMeta = await sharp(result.image.buffer).metadata();
    expect(outMeta.format).toBe("webp");
    expect(outMeta.exif).toBeUndefined();
  });

  it("keeps original ratio and does not enlarge small images", async () => {
    const source = await jpegBytes(400, 300);
    const result = await normalizeMarketingImage({
      bytes: source,
      cropAspect: "original",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.width).toBe(400);
    expect(result.image.height).toBe(300);
  });
});
