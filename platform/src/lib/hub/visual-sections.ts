/**
 * Typed Hub visual-section config for Homepage (and light About) editors.
 * Keeps volunteer IA aligned with website_documents fields — not a freeform page builder.
 */

export type VisualCategoryId = "words" | "photo" | "buttons" | "program";

export type VisualSectionCategory = {
  id: VisualCategoryId;
  label: string;
  description: string;
};

export type HomeVisualSectionId =
  | "banner"
  | "spotlight"
  | "discover"
  | "watch"
  | "locations"
  | "prayer-giving";

export type AboutVisualSectionId =
  | "who-we-are"
  | "vision-mission"
  | "leadership"
  | "portrait";

export type VisualSectionConfig<Id extends string = string> = {
  id: Id;
  label: string;
  description: string;
  categories: readonly VisualSectionCategory[];
};

const WORDS: VisualSectionCategory = {
  id: "words",
  label: "Words",
  description: "Headings, messages, and other text visitors read.",
};

const PHOTO: VisualSectionCategory = {
  id: "photo",
  label: "Photo",
  description: "The picture shown in this part of the page.",
};

const BUTTONS: VisualSectionCategory = {
  id: "buttons",
  label: "Buttons",
  description: "The clickable buttons and where they take visitors.",
};

const PROGRAM: VisualSectionCategory = {
  id: "program",
  label: "Featured program",
  description: "Which program appears in the KCMI Spotlight.",
};

export const HOME_VISUAL_SECTIONS: readonly VisualSectionConfig<HomeVisualSectionId>[] =
  [
    {
      id: "banner",
      label: "Top of Homepage",
      description: "First message and photo visitors see",
      categories: [WORDS, PHOTO, BUTTONS],
    },
    {
      id: "spotlight",
      label: "KCMI Spotlight",
      description: "Featured program and first-visit spotlight",
      categories: [PROGRAM],
    },
    {
      id: "discover",
      label: "Discover KCMI",
      description: "Welcome message and pathways to connect",
      categories: [WORDS, PHOTO],
    },
    {
      id: "watch",
      label: "Watch & Listen",
      description: "Sermon highlight used when no sermon is featured",
      categories: [WORDS],
    },
    {
      id: "locations",
      label: "Find a Location section",
      description: "Homepage invitation to find a KCMI location",
      categories: [WORDS],
    },
    {
      id: "prayer-giving",
      label: "Prayer & Giving",
      description: "Prayer and giving invitation at the bottom of the homepage",
      categories: [WORDS],
    },
  ] as const;

export const ABOUT_VISUAL_SECTIONS: readonly VisualSectionConfig<AboutVisualSectionId>[] =
  [
    {
      id: "who-we-are",
      label: "Who We Are",
      description: "The church introduction on the About page",
      categories: [WORDS],
    },
    {
      id: "vision-mission",
      label: "Vision & Mission",
      description: "Vision statement and mission points",
      categories: [WORDS],
    },
    {
      id: "leadership",
      label: "Leadership",
      description: "Lead pastor introduction and biography",
      categories: [WORDS],
    },
    {
      id: "portrait",
      label: "Lead Pastor Photo",
      description: "Portrait shown on About and Meet Our Lead Pastor",
      categories: [PHOTO],
    },
  ] as const;

export function getHomeVisualSection(
  id: string,
): VisualSectionConfig<HomeVisualSectionId> | undefined {
  return HOME_VISUAL_SECTIONS.find((section) => section.id === id);
}

export function getAboutVisualSection(
  id: string,
): VisualSectionConfig<AboutVisualSectionId> | undefined {
  return ABOUT_VISUAL_SECTIONS.find((section) => section.id === id);
}

export function homeVisualSectionIds(): HomeVisualSectionId[] {
  return HOME_VISUAL_SECTIONS.map((section) => section.id);
}

export function aboutVisualSectionIds(): AboutVisualSectionId[] {
  return ABOUT_VISUAL_SECTIONS.map((section) => section.id);
}

export function homeVisualCategoryIds(
  sectionId: HomeVisualSectionId,
): VisualCategoryId[] {
  return (
    getHomeVisualSection(sectionId)?.categories.map((category) => category.id) ??
    []
  );
}

export function aboutVisualCategoryIds(
  sectionId: AboutVisualSectionId,
): VisualCategoryId[] {
  return (
    getAboutVisualSection(sectionId)?.categories.map((category) => category.id) ??
    []
  );
}

export function homeVisualSectionTourTarget(
  sectionId: HomeVisualSectionId,
): string {
  return `home-visual-section-${sectionId}`;
}

export function editCategoryTourTarget(categoryId: VisualCategoryId): string {
  return `edit-category-${categoryId}`;
}
