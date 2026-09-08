import { describe, expect, it } from "vitest";
import {
  extractFacebookUrlFromEmbed,
  normalizeFacebookUrl,
} from "@/lib/cms/facebook-url";
import { normalizeYoutubeUrl } from "@/lib/cms/youtube-url";
import {
  detectImageMimeFromMagicBytes,
  MAX_MARKETING_IMAGE_BYTES,
  validateMarketingImage,
} from "@/lib/cms/media-validate";

describe("normalizeFacebookUrl", () => {
  it("accepts https facebook hostnames", () => {
    const ok = normalizeFacebookUrl(
      "https://www.facebook.com/share/18bfxXA9Sj/",
    );
    expect(ok).toEqual({
      ok: true,
      url: "https://www.facebook.com/share/18bfxXA9Sj/",
    });
    expect(normalizeFacebookUrl("https://m.facebook.com/kcmi").ok).toBe(true);
    expect(normalizeFacebookUrl("https://fb.watch/abc123").ok).toBe(true);
  });

  it("rejects non-https, wrong hosts, and raw HTML", () => {
    expect(normalizeFacebookUrl("http://www.facebook.com/x").ok).toBe(false);
    expect(normalizeFacebookUrl("https://evil.com/facebook").ok).toBe(false);
    expect(
      normalizeFacebookUrl('<iframe src="https://www.facebook.com/x"></iframe>')
        .ok,
    ).toBe(false);
  });
});

describe("extractFacebookUrlFromEmbed", () => {
  it("extracts iframe src and never returns HTML", () => {
    const result = extractFacebookUrlFromEmbed(
      '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F"></iframe>',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toMatch(/^https:\/\/www\.facebook\.com\//);
      expect(result.url).not.toContain("<");
    }
  });

  it("extracts anchor href", () => {
    const result = extractFacebookUrlFromEmbed(
      '<a href="https://facebook.com/share/18bfxXA9Sj/">Watch</a>',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe("https://facebook.com/share/18bfxXA9Sj/");
    }
  });
});

describe("normalizeYoutubeUrl", () => {
  it("accepts watch and shorts URLs", () => {
    expect(
      normalizeYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ").ok,
    ).toBe(true);
    expect(normalizeYoutubeUrl("https://youtu.be/dQw4w9WgXcQ").ok).toBe(true);
    expect(
      normalizeYoutubeUrl("https://m.youtube.com/shorts/dQw4w9WgXcQ").ok,
    ).toBe(true);
  });

  it("rejects channel pages, http, and embed HTML", () => {
    expect(normalizeYoutubeUrl("https://www.youtube.com/@rehoboth-tv").ok).toBe(
      false,
    );
    expect(normalizeYoutubeUrl("http://youtu.be/dQw4w9WgXcQ").ok).toBe(false);
    expect(
      normalizeYoutubeUrl(
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
      ).ok,
    ).toBe(false);
  });
});

describe("marketing image magic bytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  it("detects JPEG PNG WebP signatures", () => {
    expect(detectImageMimeFromMagicBytes(jpeg)).toBe("image/jpeg");
    expect(detectImageMimeFromMagicBytes(png)).toBe("image/png");
    expect(detectImageMimeFromMagicBytes(webp)).toBe("image/webp");
    expect(detectImageMimeFromMagicBytes(new Uint8Array([0x00, 0x01]))).toBe(
      null,
    );
  });

  it("validates size MIME and magic-byte agreement", () => {
    expect(
      validateMarketingImage({
        type: "image/jpeg",
        size: jpeg.byteLength,
        bytes: jpeg,
      }),
    ).toEqual({ ok: true, contentType: "image/jpeg" });

    expect(
      validateMarketingImage({
        type: "image/png",
        size: jpeg.byteLength,
        bytes: jpeg,
      }).ok,
    ).toBe(false);

    expect(
      validateMarketingImage({
        type: "image/jpeg",
        size: MAX_MARKETING_IMAGE_BYTES + 1,
        bytes: jpeg,
      }).ok,
    ).toBe(false);

    expect(
      validateMarketingImage({
        type: "video/mp4",
        size: 10,
        name: "talk.mp4",
        bytes: jpeg,
      }).ok,
    ).toBe(false);

    expect(
      validateMarketingImage({
        type: "image/gif",
        size: 10,
        bytes: jpeg,
      }).ok,
    ).toBe(false);
  });
});
