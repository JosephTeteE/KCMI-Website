import type { FeaturedProgram } from "@/content/types";

export function isPublicFeaturedProgram(
  program: FeaturedProgram | null,
): program is FeaturedProgram {
  return program?.status === "published";
}

export function featuredProgramCoverSrc(
  program: FeaturedProgram,
): string | null {
  return program.imageSrc;
}
