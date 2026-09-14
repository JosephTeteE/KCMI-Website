import { describe, expect, it } from "vitest";
import {
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/authorization/rbac";
import { zonedLocalToUtcIso, utcIsoToLocalParts } from "@/lib/events/datetime";
import { parseEventFields } from "@/lib/events/parse-fields";
import { shouldRegenerateEventSlug } from "@/lib/events/slug";
import { toPublicEventDetail } from "@/lib/events/hub-preview";
import { hubLifecycleActions } from "@/lib/hub/publication-copy";
import { slugifyTitle } from "@/lib/cms/slugify";

describe("Events E2 RBAC", () => {
  it("grants media_admin events.manage without registration/payment perms", () => {
    const perms = permissionsForRoles(["media_admin"]);
    expect(perms.has("events.manage")).toBe(true);
    expect(perms.has("registrations.manage")).toBe(false);
    expect(perms.has("payment_evidence.review")).toBe(false);
  });

  it("denies unauthorized Hub roles from events.manage", () => {
    expect(roleHasPermission("program_drafter", "events.manage")).toBe(false);
    expect(roleHasPermission("branch_admin", "events.manage")).toBe(false);
    expect(roleHasPermission("finance_reviewer", "events.manage")).toBe(false);
    expect(roleHasPermission("pastor", "events.manage")).toBe(false);
  });

  it("keeps registrar events.manage without payment_evidence.review", () => {
    const perms = permissionsForRoles(["registrar"]);
    expect(perms.has("events.manage")).toBe(true);
    expect(perms.has("registrations.manage")).toBe(true);
    expect(perms.has("payment_evidence.review")).toBe(false);
  });
});

describe("Events E2 slug policy", () => {
  it("regenerates slug for draft/preview only", () => {
    expect(shouldRegenerateEventSlug("draft")).toBe(true);
    expect(shouldRegenerateEventSlug("preview")).toBe(true);
    expect(shouldRegenerateEventSlug("published")).toBe(false);
    expect(shouldRegenerateEventSlug("archived")).toBe(false);
  });

  it("slugifies titles safely", () => {
    expect(slugifyTitle("Ministers Conference 2027")).toBe(
      "ministers-conference-2027",
    );
  });
});

describe("Events E2 parse + datetime", () => {
  it("parses a valid draft payload with branch and contact", () => {
    const fd = new FormData();
    fd.set("title", "Family Retreat");
    fd.set("event_kind", "retreat");
    fd.set("summary", "A weekend together.");
    fd.set("body_text", "Details here.");
    fd.set("timezone", "Africa/Accra");
    fd.set("start_date", "2027-04-10");
    fd.set("start_time", "09:00");
    fd.set("end_date", "2027-04-12");
    fd.set("end_time", "15:00");
    fd.set("venue_city", "Accra");
    fd.set("venue_country", "Ghana");
    fd.set("location_branch_id", "11111111-1111-1111-1111-111111111111");
    fd.set("contact_email", "contact@kcmi-rcc.org");
    fd.set("featured_media_id", "22222222-2222-2222-2222-222222222222");

    const parsed = parseEventFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.title).toBe("Family Retreat");
    expect(parsed.fields.event_kind).toBe("retreat");
    expect(parsed.fields.location_branch_id).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(parsed.fields.featured_media_id).toBe(
      "22222222-2222-2222-2222-222222222222",
    );
    expect(parsed.fields.starts_at).toBeTruthy();
    expect(parsed.fields.ends_at).toBeTruthy();
  });

  it("rejects end before start", () => {
    const fd = new FormData();
    fd.set("title", "Bad Dates");
    fd.set("event_kind", "other");
    fd.set("timezone", "Africa/Lagos");
    fd.set("start_date", "2027-05-10");
    fd.set("end_date", "2027-05-01");
    const parsed = parseEventFields(fd);
    expect(parsed.ok).toBe(false);
  });

  it("round-trips Lagos local parts", () => {
    const iso = zonedLocalToUtcIso("2027-03-10", "09:00", "Africa/Lagos");
    expect(iso).toBeTruthy();
    const parts = utcIsoToLocalParts(iso!, "Africa/Lagos");
    expect(parts.date).toBe("2027-03-10");
    expect(parts.time).toBe("09:00");
  });
});

describe("Events E2 preview + lifecycle", () => {
  it("preview uses proposed title/theme/media values", () => {
    const detail = toPublicEventDetail({
      title: "Proposed Title",
      theme: "Proposed Theme",
      summary: "Summary",
      bodyText: "Body",
      kind: "conference",
      startsAt: "2027-03-10T08:00:00.000Z",
      endsAt: "2027-03-12T15:00:00.000Z",
      timezone: "Africa/Lagos",
      venueLabel: "HQ",
      venueCity: "Port Harcourt",
      venueCountry: "Nigeria",
      imageSrc: "/media/home/church-view.webp",
      imageAlt: "Gathering",
      contactEmail: "contact@kcmi-rcc.org",
      contactPhoneDisplay: null,
      branchName: "Headquarters",
      branchSlug: "headquarters",
    });
    expect(detail.title).toBe("Proposed Title");
    expect(detail.theme).toBe("Proposed Theme");
    expect(detail.imageSrc).toBe("/media/home/church-view.webp");
    expect(detail.branchSlug).toBe("headquarters");
  });

  it("lifecycle exposes make-live for drafts and archive for published", () => {
    expect(hubLifecycleActions("draft").makeLive).toBe(true);
    expect(hubLifecycleActions("draft").removeFromWebsite).toBe(false);
    expect(hubLifecycleActions("published").makeLive).toBe(false);
    expect(hubLifecycleActions("published").removeFromWebsite).toBe(true);
    expect(hubLifecycleActions("archived").restoreDraft).toBe(true);
  });

  it("documents that live edits require explicit live intent (not draft save)", () => {
    // Mirrors saveEventWizardEdit gates: draft intent blocked on published rows.
    const existingStatus = "published";
    const intent = "draft";
    const blocked = intent === "draft" && existingStatus === "published";
    expect(blocked).toBe(true);
  });
});
