import type { MetadataRoute } from "next";
import { getChurchIdentity } from "@/content";
import { isStagingEnvironment } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const identity = getChurchIdentity();
  if (isStagingEnvironment()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: identity.siteUrl,
    };
  }
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
