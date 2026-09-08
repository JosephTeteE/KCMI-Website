export const CROP_ASPECT_IDS = ["hero", "card", "square", "original"] as const;

export type CropAspectId = (typeof CROP_ASPECT_IDS)[number];

export type CropAspectOption = {
  id: CropAspectId;
  label: string;
  /** Width ÷ height. Null keeps the source ratio (gallery). */
  ratio: number | null;
};

export const CROP_ASPECTS: readonly CropAspectOption[] = [
  { id: "hero", label: "Hero · 16:9", ratio: 16 / 9 },
  { id: "card", label: "Card · 4:3", ratio: 4 / 3 },
  { id: "square", label: "Square · 1:1", ratio: 1 },
  { id: "original", label: "Gallery · original ratio", ratio: null },
];

export type FocalPoint = {
  x: number;
  y: number;
};

export type CropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function parseCropAspect(value: unknown): CropAspectId {
  if (typeof value !== "string") return "original";
  return (CROP_ASPECT_IDS as readonly string[]).includes(value)
    ? (value as CropAspectId)
    : "original";
}

export function clampFocal(value: number, fallback = 0.5): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function parseFocalPoint(
  x: unknown,
  y: unknown,
): FocalPoint {
  const fx =
    typeof x === "string" || typeof x === "number" ? Number(x) : Number.NaN;
  const fy =
    typeof y === "string" || typeof y === "number" ? Number(y) : Number.NaN;
  return {
    x: clampFocal(fx),
    y: clampFocal(fy),
  };
}

export function cropRectForAspect(
  width: number,
  height: number,
  targetAspect: number,
  focal: FocalPoint,
): CropRect {
  const imageAspect = width / Math.max(height, 1);
  let cropW: number;
  let cropH: number;

  if (imageAspect > targetAspect) {
    cropH = height;
    cropW = Math.max(1, Math.round(height * targetAspect));
  } else {
    cropW = width;
    cropH = Math.max(1, Math.round(width / targetAspect));
  }

  cropW = Math.min(cropW, width);
  cropH = Math.min(cropH, height);

  const cx = clampFocal(focal.x) * width;
  const cy = clampFocal(focal.y) * height;
  const left = Math.min(Math.max(0, Math.round(cx - cropW / 2)), width - cropW);
  const top = Math.min(Math.max(0, Math.round(cy - cropH / 2)), height - cropH);

  return { left, top, width: cropW, height: cropH };
}

export function ratioForCrop(id: CropAspectId): number | null {
  return CROP_ASPECTS.find((item) => item.id === id)?.ratio ?? null;
}
