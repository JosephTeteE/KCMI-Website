export type HubMediaPlacementCopy = {
  title: string;
  where: string;
  recommended: string;
};

export const HUB_MEDIA_PLACEMENTS = {
  homeTopBanner: {
    title: "Homepage Top Banner Photo",
    where:
      "The large photo at the top of the homepage — the first thing visitors see.",
    recommended:
      "Use a clear, wide church photo. The website crops it to fit this banner automatically.",
  },
  homeWelcome: {
    title: "Homepage Welcome Photo",
    where: "The photo beside the welcome message on the homepage.",
    recommended:
      "Use a warm photo of church life. The website fits it to this spot automatically.",
  },
  aboutPortrait: {
    title: "Lead Pastor Photo",
    where:
      "The portrait on the About KCMI page and the Meet Our Lead Pastor page.",
    recommended:
      "Use a clear face-and-shoulders photo. The website makes it square automatically.",
  },
  programPoster: {
    title: "Program Poster / Main Photo",
    where:
      "Shown on the homepage when this program is featured, and with the program details.",
    recommended:
      "Use the program poster. The website fits it to the card automatically.",
  },
  branchTopPhoto: {
    title: "Branch Top Photo",
    where: "The large photo at the top of this branch’s page on the website.",
    recommended:
      "Use a photo of this branch’s building or gathering. The website crops it to fit automatically.",
  },
  branchGallery: {
    title: "More branch photos",
    where: "Extra photos on this branch’s page, under the top photo.",
    recommended:
      "Add photos of this location. Keep the photo as it is — no special crop is needed.",
  },
  library: {
    title: "Photo library",
    where: "Saved photos you can use later on website pages.",
    recommended: "Upload a clear photo. You will choose where it appears later.",
  },
} as const satisfies Record<string, HubMediaPlacementCopy>;

export const HUB_CROP_LABELS = {
  hero: "Wide photo for the top of a page",
  card: "Photo for a program card",
  square: "Square portrait photo",
  original: "Keep the photo as it is",
} as const;
