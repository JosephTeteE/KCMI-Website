import type { PublicSearchResult } from "@/lib/search/types";

/**
 * Curated visitor-facing pages. Intentionally excludes Privacy, Terms,
 * Hub/admin, auth, QA, and developer fixtures.
 */
export const PUBLIC_SEARCH_PAGE_CATALOG: Array<
  Omit<PublicSearchResult, "rankScore"> & { body: string }
> = [
  {
    type: "page",
    title: "About KCMI",
    summary:
      "Learn about Kingdom Covenant Ministries International, our vision, and leadership.",
    url: "/about",
    context: "Page",
    imageUrl: null,
    body: "about kcmi kingdom covenant ministries international vision leadership apostle",
  },
  {
    type: "page",
    title: "Apostle Philemon Frank Aikins",
    summary:
      "Senior Pastor and Founder of Kingdom Covenant Ministries International.",
    url: "/about/apostle-frank-aikins",
    context: "Page",
    imageUrl: null,
    body: "apostle philemon frank aikins pastor founder leadership",
  },
  {
    type: "page",
    title: "Services",
    summary:
      "Worship times, cell fellowships, service teams, and ways to connect at KCMI.",
    url: "/services",
    context: "Page",
    imageUrl: null,
    body: "services worship cell fellowship teams prayer",
  },
  {
    type: "page",
    title: "Sermons",
    summary:
      "Watch KCMI sermons on YouTube and other verified media destinations.",
    url: "/sermons",
    context: "Page",
    imageUrl: null,
    body: "sermons messages media youtube watch listen",
  },
  {
    type: "page",
    title: "FAQs",
    summary:
      "Answers to common questions about visiting and connecting with KCMI.",
    url: "/faqs",
    context: "Page",
    imageUrl: null,
    body: "faqs frequently asked questions visit",
  },
  {
    type: "page",
    title: "Contact",
    summary: "Email or call the church office and find KCMI locations.",
    url: "/contact",
    context: "Page",
    imageUrl: null,
    body: "contact email phone connect office",
  },
  {
    type: "page",
    title: "Giving",
    summary:
      "Give to Kingdom Covenant Ministries International and support the work of the church.",
    url: "/giving",
    context: "Page",
    imageUrl: null,
    body: "giving tithe offering stewardship generosity",
  },
  {
    type: "page",
    title: "Locations",
    summary: "Find KCMI branches and locations across nations.",
    url: "/locations",
    context: "Page",
    imageUrl: null,
    body: "locations branches churches find visit",
  },
  {
    type: "page",
    title: "Livestream",
    summary: "Watch KCMI livestream when a service is live online.",
    url: "/livestream",
    context: "Page",
    imageUrl: null,
    body: "livestream live watch online service",
  },
];

/** Paths that must never appear as Search V2 page results. */
export const PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/auth",
  "/qa",
  "/privacy",
  "/terms",
] as const;
