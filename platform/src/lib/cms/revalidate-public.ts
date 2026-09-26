import { revalidatePath } from "next/cache";
import type { WebsiteDocumentKey } from "@/content/website/keys";

/**
 * Public invalidation contract.
 * Publish/update must drop cached HTML for the routes visitors actually open.
 * Draft and staged-photo saves must not call these helpers.
 */

export function revalidatePublishedProgram(slug: string | null | undefined): void {
  revalidatePath("/");
  revalidatePath("/programs");
  revalidatePath("/programs/[slug]", "page");
  revalidatePath("/search");
  if (slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    revalidatePath(`/programs/${slug}`);
  }
}

export function publicPathsForWebsiteDocument(
  key: WebsiteDocumentKey,
): string[] {
  switch (key) {
    case "home":
      return ["/"];
    case "about":
      return ["/about", "/about/apostle-frank-aikins"];
    case "services":
      return ["/services"];
    case "faqs":
      return ["/faqs"];
    case "sermons_page":
      return ["/sermons"];
    case "global":
      return ["/"];
    default:
      return ["/"];
  }
}

export function revalidatePublishedWebsite(
  key: WebsiteDocumentKey,
): void {
  if (key === "global" || key === "home") {
    revalidatePath("/", "layout");
  }
  for (const path of publicPathsForWebsiteDocument(key)) {
    revalidatePath(path);
  }
  revalidatePath("/search");
}

export function revalidatePublishedLocation(slug: string | null | undefined): void {
  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/locations/[slug]", "page");
  if (slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    revalidatePath(`/locations/${slug}`);
  }
}
