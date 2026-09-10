export const WEBSITE_DOCUMENT_KEYS = [
  "home",
  "about",
  "services",
  "global",
  "faqs",
  "sermons_page",
] as const;

export type WebsiteDocumentKey = (typeof WEBSITE_DOCUMENT_KEYS)[number];

export function isWebsiteDocumentKey(value: string): value is WebsiteDocumentKey {
  return (WEBSITE_DOCUMENT_KEYS as readonly string[]).includes(value);
}

/** Stable ids so revisions attach to the same rows after migrate. */
export const WEBSITE_DOCUMENT_IDS: Record<WebsiteDocumentKey, string> = {
  home: "a0000000-0000-4000-8000-000000000001",
  about: "a0000000-0000-4000-8000-000000000002",
  services: "a0000000-0000-4000-8000-000000000003",
  global: "a0000000-0000-4000-8000-000000000004",
  faqs: "a0000000-0000-4000-8000-000000000005",
  sermons_page: "a0000000-0000-4000-8000-000000000006",
};
