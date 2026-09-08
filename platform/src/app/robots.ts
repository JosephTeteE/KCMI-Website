import type { MetadataRoute } from "next";
import { getChurchIdentity } from "@/content";

export default function robots(): MetadataRoute.Robots {
  const identity = getChurchIdentity();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/api", "/qa"],
    },
    sitemap: `${identity.siteUrl}/sitemap.xml`,
    host: identity.siteUrl,
  };
}
