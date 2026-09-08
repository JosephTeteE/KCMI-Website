import type { MetadataRoute } from "next";
import { getChurchIdentity } from "@/content";

const publicPaths = [
  "/",
  "/about",
  "/mission",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/faqs",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getChurchIdentity();
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
