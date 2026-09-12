/**
 * Responsive width matrix for QA1 DOM sweep + interaction tiers.
 */

export const BOUNDARY_WIDTHS = [
  320, 375, 390, 430, 639, 640, 641, 767, 768, 769, 1023, 1024, 1025, 1279,
  1280, 1281, 1535, 1536, 1537, 1920, 2560, 3840,
] as const;

export const INTERACTION_WIDTHS = [390, 768, 1280, 1920] as const;

export type DeviceClass = "phone" | "tablet" | "laptop" | "desktop" | "ultrawide";

export function deviceClassForWidth(width: number): DeviceClass {
  if (width < 640) return "phone";
  if (width < 1024) return "tablet";
  if (width < 1440) return "laptop";
  if (width < 2560) return "desktop";
  return "ultrawide";
}

export function heightForWidth(width: number): number {
  const cls = deviceClassForWidth(width);
  switch (cls) {
    case "phone":
      return 844;
    case "tablet":
      return 1024;
    case "laptop":
      return 800;
    case "desktop":
      return 900;
    case "ultrawide":
      return 1080;
  }
}

export const HUB_BODY_MIN_PX = 16;
export const HUB_HELP_MIN_PX = 15;
export const HUB_META_MIN_PX = 14;
export const HUB_TOUCH_PREF_PX = 44;
