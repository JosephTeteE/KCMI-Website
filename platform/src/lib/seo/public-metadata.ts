import type { Metadata } from "next";
import { getChurchIdentity } from "@/content";

export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { siteUrl } = getChurchIdentity();
  const url = `${siteUrl}${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: `${input.title} · KCMI`,
      description: input.description,
      url,
      type: "website",
    },
  };
}
