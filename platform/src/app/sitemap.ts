import type { MetadataRoute } from "next";
import { getChurchIdentity } from "@/content";
import { isStagingEnvironment } from "@/lib/env";

const publicPaths = [
  "/",
  "/about",
  "/about/apostle-frank-aikins",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/faqs",
  "/privacy",
  "/terms",
  "/events",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (isStagingEnvironment()) {
    return [];
  }
  const { siteUrl } = getChurchIdentity();
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
