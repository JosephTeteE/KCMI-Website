export type PublicEventKind =
  | "camp"
  | "conference"
  | "convention"
  | "retreat"
  | "special_service"
  | "other";

export type PublicEventCard = {
  id: string;
  slug: string;
  title: string;
  theme: string | null;
  summary: string;
  kind: PublicEventKind;
  kindLabel: string;
  datesLabel: string;
  venueLabel: string | null;
  placeLabel: string | null;
  imageSrc: string | null;
  imageAlt: string;
  startsAt: string;
  endsAt: string | null;
  isPast: boolean;
};

export type PublicEventDetail = PublicEventCard & {
  bodyText: string;
  timezone: string;
  contactEmail: string | null;
  contactPhoneDisplay: string | null;
  branchName: string | null;
  branchSlug: string | null;
};
