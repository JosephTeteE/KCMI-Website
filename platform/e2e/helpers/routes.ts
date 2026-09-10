export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/apostle-frank-aikins",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/events",
  "/faqs",
  "/privacy",
  "/terms",
  "/locations/headquarters",
  "/locations/accra",
  "/locations/togo",
] as const;

export const LAYOUT_VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
] as const;

export const VISUAL_VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
] as const;

export const FOOTER_VIEWPORTS = LAYOUT_VIEWPORTS;

export function snapshotName(parts: string[]): string {
  return `${parts.join("-")}.png`;
}
