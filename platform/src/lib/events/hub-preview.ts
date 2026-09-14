import {
  eventKindLabel,
  formatEventDateLabel,
  isPastEvent,
} from "@/lib/events/format";
import type { PublicEventDetail, PublicEventKind } from "@/lib/events/types";
import { publicPlaceLabel } from "@/content/branch-groups";

export type HubEventPreviewInput = {
  id?: string;
  slug?: string;
  title: string;
  theme: string | null;
  summary: string;
  bodyText: string;
  kind: PublicEventKind;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  venueLabel: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  imageSrc: string | null;
  imageAlt: string;
  contactEmail: string | null;
  contactPhoneDisplay: string | null;
  branchName: string | null;
  branchSlug: string | null;
};

/** Build the same public Event detail shape used on /events/[slug]. */
export function toPublicEventDetail(
  input: HubEventPreviewInput,
): PublicEventDetail {
  return {
    id: input.id ?? "preview",
    slug: input.slug ?? "preview",
    title: input.title,
    theme: input.theme,
    summary: input.summary,
    kind: input.kind,
    kindLabel: eventKindLabel(input.kind),
    datesLabel: formatEventDateLabel({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
    }),
    venueLabel: input.venueLabel,
    placeLabel: publicPlaceLabel(input.venueCity, input.venueCountry) || null,
    imageSrc: input.imageSrc,
    imageAlt: input.imageAlt,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isPast: isPastEvent({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    }),
    bodyText: input.bodyText,
    timezone: input.timezone,
    contactEmail: input.contactEmail,
    contactPhoneDisplay: input.contactPhoneDisplay,
    branchName: input.branchName,
    branchSlug: input.branchSlug,
  };
}
