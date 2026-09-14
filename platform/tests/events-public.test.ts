import { describe, expect, it } from "vitest";
import {
  formatEventDateLabel,
  isPastEvent,
  isPublicPublishedEventStatus,
} from "@/lib/events/format";
import {
  partitionEventsByTime,
  resolvePublicEventSlug,
} from "@/lib/events/public-event";
import {
  reviewEventBySlug,
  reviewPublishedEvents,
} from "@/lib/events/review-fixtures";
import type { PublicEventCard } from "@/lib/events/types";

function card(
  overrides: Partial<PublicEventCard> &
    Pick<PublicEventCard, "id" | "slug" | "title" | "startsAt">,
): PublicEventCard {
  return {
    theme: null,
    summary: "",
    kind: "other",
    kindLabel: "Event",
    datesLabel: "",
    venueLabel: null,
    placeLabel: null,
    imageSrc: null,
    imageAlt: "",
    endsAt: null,
    isPast: false,
    ...overrides,
  };
}

describe("Events E1 publication gate", () => {
  it("allows only published status for public visitors", () => {
    expect(isPublicPublishedEventStatus("published")).toBe(true);
    expect(isPublicPublishedEventStatus("draft")).toBe(false);
    expect(isPublicPublishedEventStatus("preview")).toBe(false);
    expect(isPublicPublishedEventStatus("archived")).toBe(false);
  });

  it("scaffold slug resolver never invents unpublished events", () => {
    expect(resolvePublicEventSlug("draft-camp")).toBeNull();
    expect(resolvePublicEventSlug("camp-meeting")).toBeNull();
    expect(resolvePublicEventSlug("unknown-event")).toBeNull();
  });
});

describe("Events E1 date formatting", () => {
  it("formats multi-day ranges in Africa/Lagos", () => {
    const label = formatEventDateLabel({
      startsAt: "2026-08-12T00:00:00+01:00",
      endsAt: "2026-08-16T23:59:00+01:00",
      timezone: "Africa/Lagos",
    });
    expect(label).toBe("12 August – 16 August 2026");
  });

  it("formats single-day with times when present", () => {
    const label = formatEventDateLabel({
      startsAt: "2026-03-10T09:00:00+01:00",
      endsAt: "2026-03-10T16:00:00+01:00",
      timezone: "Africa/Lagos",
    });
    expect(label).toMatch(/10 March 2026/);
    expect(label).toMatch(/9:00/);
    expect(label).toMatch(/4:00/);
  });
});

describe("Events E1 upcoming / past partition", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("places published upcoming and past correctly", () => {
    const upcomingEvent = card({
      id: "u1",
      slug: "future-conference",
      title: "Future Conference",
      startsAt: "2026-09-01T09:00:00Z",
      endsAt: "2026-09-03T17:00:00Z",
    });
    const pastEvent = card({
      id: "p1",
      slug: "past-retreat",
      title: "Past Retreat",
      startsAt: "2025-11-01T09:00:00Z",
      endsAt: "2025-11-03T17:00:00Z",
    });

    const { upcoming, past } = partitionEventsByTime(
      [pastEvent, upcomingEvent],
      now,
    );

    expect(upcoming.map((e) => e.slug)).toEqual(["future-conference"]);
    expect(past.map((e) => e.slug)).toEqual(["past-retreat"]);
    expect(isPastEvent(pastEvent, now)).toBe(true);
    expect(isPastEvent(upcomingEvent, now)).toBe(false);
  });

  it("orders past events newest first", () => {
    const older = card({
      id: "o",
      slug: "older",
      title: "Older",
      startsAt: "2024-01-01T00:00:00Z",
      endsAt: "2024-01-02T00:00:00Z",
    });
    const newer = card({
      id: "n",
      slug: "newer",
      title: "Newer",
      startsAt: "2025-06-01T00:00:00Z",
      endsAt: "2025-06-02T00:00:00Z",
    });
    const { past } = partitionEventsByTime([older, newer], now);
    expect(past.map((e) => e.slug)).toEqual(["newer", "older"]);
  });
});

describe("Events E1 review fixtures (media / location)", () => {
  it("provides upcoming with media and past without media", () => {
    const { upcoming, past } = reviewPublishedEvents();
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(1);
    expect(upcoming[0]!.imageSrc).toBeTruthy();
    expect(past[0]!.imageSrc).toBeNull();
    expect(upcoming[0]!.placeLabel).toMatch(/Port Harcourt/);
    expect(past[0]!.placeLabel).toMatch(/Accra/);
  });

  it("resolves published fixture slugs and rejects unknown", () => {
    const withImage = reviewEventBySlug("ministers-conference-review");
    const withoutImage = reviewEventBySlug("family-retreat-review");
    expect(withImage?.imageSrc).toBeTruthy();
    expect(withImage?.branchSlug).toBe("headquarters");
    expect(withoutImage?.imageSrc).toBeNull();
    expect(withoutImage?.contactPhoneDisplay).toBeTruthy();
    expect(reviewEventBySlug("draft-secret")).toBeNull();
    expect(reviewEventBySlug("unknown-event")).toBeNull();
  });
});

describe("Events E1 metadata safety (unpublished titles)", () => {
  it("does not expose draft titles through review slug lookup", () => {
    const draftSlug = "secret-draft-camp-2025-level-up";
    expect(reviewEventBySlug(draftSlug)).toBeNull();
    expect(resolvePublicEventSlug(draftSlug)).toBeNull();
  });
});
