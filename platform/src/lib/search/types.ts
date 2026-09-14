export const SEARCH_QUERY_MAX_LENGTH = 80;

export type PublicSearchResultType = "page" | "program" | "sermon" | "location";

export type PublicSearchResult = {
  type: PublicSearchResultType;
  title: string;
  summary: string | null;
  url: string;
  context: string | null;
  imageUrl: string | null;
  rankScore: number;
};

export type PublicSearchTypeFilter = "all" | PublicSearchResultType;

export const SEARCH_TYPE_FILTERS: {
  id: PublicSearchTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "program", label: "Programs" },
  { id: "sermon", label: "Sermons" },
  { id: "location", label: "Locations" },
  { id: "page", label: "Pages" },
];

export function searchResultTypeLabel(type: PublicSearchResultType): string {
  switch (type) {
    case "page":
      return "Page";
    case "program":
      return "Program";
    case "sermon":
      return "Sermon";
    case "location":
      return "Location";
  }
}
