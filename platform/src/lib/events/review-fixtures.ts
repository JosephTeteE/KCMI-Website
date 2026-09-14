/**
 * Synthetic Events fixtures for E1 visual review screenshots only.
 * Enabled when EVENTS_E1_REVIEW_FIXTURES=1 and NODE_ENV !== "production".
 * Never seeds production CMS content. Not legacy Camp 2025.
 */

import { formatEventDateLabel, isPastEvent } from "@/lib/events/format";
import type { PublicEventCard, PublicEventDetail } from "@/lib/events/types";

export function shouldUseEventsReviewFixtures(): boolean {
  return (
    process.env.EVENTS_E1_REVIEW_FIXTURES === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

function card(
  partial: Omit<PublicEventCard, "datesLabel" | "kindLabel" | "isPast"> & {
    kindLabel?: string;
  },
): PublicEventCard {
  const datesLabel = formatEventDateLabel({
    startsAt: partial.startsAt,
    endsAt: partial.endsAt,
    timezone: "Africa/Lagos",
  });
  return {
    ...partial,
    kindLabel: partial.kindLabel ?? "Event",
    datesLabel,
    isPast: isPastEvent({
      startsAt: partial.startsAt,
      endsAt: partial.endsAt,
    }),
  };
}

const upcoming = card({
  id: "review-upcoming",
  slug: "ministers-conference-review",
  title: "Ministers Conference",
  theme: "Strengthening the Church",
  summary:
    "A gathering for pastors and leaders across KCMI to pray, teach, and plan together.",
  kind: "conference",
  kindLabel: "Conference",
  venueLabel: "KCMI Headquarters",
  placeLabel: "Port Harcourt · Nigeria",
  imageSrc: "/media/home/church-view.webp",
  imageAlt: "KCMI gathering",
  startsAt: "2027-03-10T09:00:00+01:00",
  endsAt: "2027-03-12T16:00:00+01:00",
});

const past = card({
  id: "review-past",
  slug: "family-retreat-review",
  title: "Family Retreat",
  theme: null,
  summary: "A weekend of worship and fellowship for families across our branches.",
  kind: "retreat",
  kindLabel: "Retreat",
  venueLabel: null,
  placeLabel: "Accra · Ghana",
  imageSrc: null,
  imageAlt: "",
  startsAt: "2025-11-14T09:00:00+00:00",
  endsAt: "2025-11-16T15:00:00+00:00",
});

const withImage: PublicEventDetail = {
  ...upcoming,
  bodyText:
    "Join us for teaching sessions, prayer, and fellowship.\n\nAll ministers and church workers are welcome. Further details will be shared by branch leaders.",
  timezone: "Africa/Lagos",
  contactEmail: "contact@kcmi-rcc.org",
  contactPhoneDisplay: null,
  branchName: "Headquarters",
  branchSlug: "headquarters",
};

const withoutImage: PublicEventDetail = {
  ...past,
  bodyText:
    "Thank you to everyone who joined this retreat. Photos and follow-up notes are shared through branch channels.",
  timezone: "Africa/Accra",
  contactEmail: null,
  contactPhoneDisplay: "+233 00 000 0000",
  branchName: null,
  branchSlug: null,
};

export function reviewPublishedEvents(): {
  upcoming: PublicEventCard[];
  past: PublicEventCard[];
} {
  return {
    upcoming: [upcoming],
    past: [past],
  };
}

export function reviewEventBySlug(slug: string): PublicEventDetail | null {
  if (slug === withImage.slug) return withImage;
  if (slug === withoutImage.slug) return withoutImage;
  return null;
}
