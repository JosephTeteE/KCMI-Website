"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { validateCtaUrl } from "@/lib/cms/cta-url";
import { validateSocialUrl } from "@/lib/cms/social-url";
import { isSilverbirdOwnedHref } from "@/content/website/sanitize-public-href";
import { parseWebsiteDocumentSave } from "@/content/website/resolve";
import {
  WEBSITE_DOCUMENT_IDS,
  type WebsiteDocumentKey,
} from "@/content/website/keys";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function lines(value: FormDataEntryValue | null): string[] {
  const raw = emptyToNull(value);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseHref(raw: string | null, fallback: string): string {
  const value = (raw ?? "").trim() || fallback;
  if (value.startsWith("#") || value.startsWith("/")) return value;
  const cta = validateCtaUrl(value);
  return cta.ok && cta.url ? cta.url : fallback;
}

async function saveDocument(
  key: WebsiteDocumentKey,
  payload: Record<string, unknown>,
  summary: string,
) {
  const parsed = parseWebsiteDocumentSave(key, payload);
  if (!parsed.ok) {
    redirectWithError(`/admin/website/${hubPath(key)}`, parsed.error);
  }

  const gate = await requireStaffAction("website.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/website/${hubPath(key)}`, gate.message);
  }

  const id = WEBSITE_DOCUMENT_IDS[key];
  const actorId = gate.session.user.id;
  const supabase = await createClient();
  const { error } = await supabase
    .from("website_documents")
    .update({
      payload: parsed.payload as Json,
      status: "published",
      updated_by: actorId,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirectWithError(`/admin/website/${hubPath(key)}`, error.message);
  }

  await writeAuditEvent({
    action: "website_document.update",
    entityType: "website_document",
    entityId: id,
    actorId,
    metadata: { document_key: key },
  });

  await saveRevision({
    entityType: "website_document",
    entityId: id,
    snapshot: parsed.payload,
    changedBy: actorId,
    changeSummary: summary,
  });

  redirectWithMessage(
    `/admin/website/${hubPath(key)}`,
    key === "home"
      ? "Your new homepage message is now live."
      : key === "about"
        ? "Your About KCMI wording is now live."
        : key === "services"
          ? "Your Services page wording is now live."
          : key === "global"
            ? "The information shown across the website is now live."
            : key === "faqs"
              ? "Your questions and answers are now live."
              : "Your Sermons page wording is now live.",
  );
}

function hubPath(key: WebsiteDocumentKey): string {
  if (key === "sermons_page") return "sermons";
  return key;
}

export async function saveHomeDocument(formData: FormData) {
  await saveDocument(
    "home",
    {
      heroKicker: emptyToNull(formData.get("heroKicker")),
      heroHeadline: emptyToNull(formData.get("heroHeadline")),
      heroSupporting: emptyToNull(formData.get("heroSupporting")),
      heroPrimaryCtaLabel: emptyToNull(formData.get("heroPrimaryCtaLabel")),
      heroPrimaryCtaHref: parseHref(
        emptyToNull(formData.get("heroPrimaryCtaHref")),
        "#worship",
      ),
      heroSecondaryCtaLabel: emptyToNull(formData.get("heroSecondaryCtaLabel")),
      heroSecondaryCtaHref: parseHref(
        emptyToNull(formData.get("heroSecondaryCtaHref")),
        "/livestream",
      ),
      heroMediaId: emptyToNull(formData.get("heroMediaId")),
      welcomeEyebrow: emptyToNull(formData.get("welcomeEyebrow")),
      welcomeHeading: emptyToNull(formData.get("welcomeHeading")),
      welcomeBody: emptyToNull(formData.get("welcomeBody")),
      welcomeMediaId: emptyToNull(formData.get("welcomeMediaId")),
      prayerHeading: emptyToNull(formData.get("prayerHeading")),
      prayerVerse: emptyToNull(formData.get("prayerVerse")),
      prayerVerseReference: emptyToNull(formData.get("prayerVerseReference")),
      prayerBody: lines(formData.get("prayerBody")),
      prayerCtaLabel: emptyToNull(formData.get("prayerCtaLabel")),
      prayerCtaHref: parseHref(
        emptyToNull(formData.get("prayerCtaHref")),
        "/prayer",
      ),
      givingHeading: emptyToNull(formData.get("givingHeading")),
      givingVerse: emptyToNull(formData.get("givingVerse")),
      givingVerseReference: emptyToNull(formData.get("givingVerseReference")),
      givingCtaLabel: emptyToNull(formData.get("givingCtaLabel")),
      givingCtaHref: parseHref(emptyToNull(formData.get("givingCtaHref")), "/giving"),
      sermonFallbackTitle: emptyToNull(formData.get("sermonFallbackTitle")),
      sermonFallbackDescription: emptyToNull(
        formData.get("sermonFallbackDescription"),
      ),
      sermonFallbackCtaLabel: emptyToNull(formData.get("sermonFallbackCtaLabel")),
      sermonFallbackCtaHref: parseHref(
        emptyToNull(formData.get("sermonFallbackCtaHref")),
        "/sermons",
      ),
      sermonFallbackYoutubeUrl: emptyToNull(
        formData.get("sermonFallbackYoutubeUrl"),
      ),
      sermonFallbackYoutubeLabel: emptyToNull(
        formData.get("sermonFallbackYoutubeLabel"),
      ),
      featuredProgramId: emptyToNull(formData.get("featuredProgramId")),
      locationsHeading: emptyToNull(formData.get("locationsHeading")),
      locationsSupporting: emptyToNull(formData.get("locationsSupporting")),
      spotlightTakeoverEnabled:
        formData.get("spotlightTakeoverEnabled") === "on" ||
        formData.get("spotlightTakeoverEnabled") === "true",
      spotlightTakeoverMode:
        emptyToNull(formData.get("spotlightTakeoverMode")) === "once_per_session"
          ? "once_per_session"
          : "once_per_browser",
      spotlightPromoVideoUrl: emptyToNull(formData.get("spotlightPromoVideoUrl")),
      spotlightWindowStart: emptyToNull(formData.get("spotlightWindowStart")),
      spotlightWindowEnd: emptyToNull(formData.get("spotlightWindowEnd")),
    },
    "Updated Home website content",
  );
}

export async function saveAboutDocument(formData: FormData) {
  await saveDocument(
    "about",
    {
      whoWeAre: lines(formData.get("whoWeAre")),
      vision: emptyToNull(formData.get("vision")),
      missionParagraphs: lines(formData.get("missionParagraphs")),
      leadershipName: emptyToNull(formData.get("leadershipName")),
      leadershipRole: emptyToNull(formData.get("leadershipRole")),
      leadershipOrgLine: emptyToNull(formData.get("leadershipOrgLine")),
      leadershipHeadquarters: emptyToNull(formData.get("leadershipHeadquarters")),
      leadershipPreview: emptyToNull(formData.get("leadershipPreview")),
      portraitMediaId: emptyToNull(formData.get("portraitMediaId")),
      portraitAlt: emptyToNull(formData.get("portraitAlt")),
      bioParagraphs: lines(formData.get("bioParagraphs")),
    },
    "Updated About KCMI content",
  );
}

export async function saveServicesDocument(formData: FormData) {
  await saveDocument(
    "services",
    {
      intro: emptyToNull(formData.get("intro")),
      cellTitle: emptyToNull(formData.get("cellTitle")),
      cellBody: emptyToNull(formData.get("cellBody")),
      cellCta: {
        label: emptyToNull(formData.get("cellCtaLabel")),
        href: emptyToNull(formData.get("cellCtaHref")),
      },
      teamsTitle: emptyToNull(formData.get("teamsTitle")),
      teamsBody: emptyToNull(formData.get("teamsBody")),
      teamsCta: {
        label: emptyToNull(formData.get("teamsCtaLabel")),
        href: emptyToNull(formData.get("teamsCtaHref")),
      },
      mediaTitle: emptyToNull(formData.get("mediaTitle")),
      mediaBody: emptyToNull(formData.get("mediaBody")),
      careTitle: emptyToNull(formData.get("careTitle")),
      careBody: emptyToNull(formData.get("careBody")),
      careLinks: [0, 1, 2]
        .map((index) => ({
          label: emptyToNull(formData.get(`careLabel${index}`)),
          href: emptyToNull(formData.get(`careHref${index}`)),
          external: false,
        }))
        .filter((link) => link.label && link.href),
      testimoniesTitle: emptyToNull(formData.get("testimoniesTitle")),
      testimoniesBody: emptyToNull(formData.get("testimoniesBody")),
      testimoniesCta: {
        label: emptyToNull(formData.get("testimoniesCtaLabel")),
        href: emptyToNull(formData.get("testimoniesCtaHref")),
      },
    },
    "Updated Services website content",
  );
}

export async function saveGlobalDocument(formData: FormData) {
  const social: { label: string; href: string }[] = [];
  for (let i = 0; i < 8; i += 1) {
    const label = emptyToNull(formData.get(`socialLabel${i}`));
    const href = emptyToNull(formData.get(`socialHref${i}`));
    if (!label && !href) continue;
    if (!label || !href) {
      redirectWithError("/admin/website/global", "Each social button needs a name and a link.");
    }
    const valid = validateSocialUrl(href);
    if (!valid.ok) {
      redirectWithError("/admin/website/global", `${label}: ${valid.error}`);
    }
    social.push({ label, href: valid.url });
  }

  const spotify = validateSocialUrl(emptyToNull(formData.get("dfrSpotifyHref")));
  if (!spotify.ok) {
    redirectWithError("/admin/website/global", `Spotify: ${spotify.error}`);
  }

  await saveDocument(
    "global",
    {
      contactEmail: emptyToNull(formData.get("contactEmail")),
      contactEmailLabel: emptyToNull(formData.get("contactEmailLabel")),
      contactPhoneDisplay: emptyToNull(formData.get("contactPhoneDisplay")),
      contactPhoneTel: emptyToNull(formData.get("contactPhoneTel")),
      contactIntro: emptyToNull(formData.get("contactIntro")),
      dfrHeading: emptyToNull(formData.get("dfrHeading")),
      dfrBody: emptyToNull(formData.get("dfrBody")),
      dfrSpotifyLabel: emptyToNull(formData.get("dfrSpotifyLabel")),
      dfrSpotifyHref: spotify.url,
      livestreamHeading: emptyToNull(formData.get("livestreamHeading")),
      livestreamNotLiveMessage: emptyToNull(
        formData.get("livestreamNotLiveMessage"),
      ),
      livestreamLiveMessage: emptyToNull(formData.get("livestreamLiveMessage")),
      socialLinks: social,
    },
    "Updated global contact, social, and footer copy",
  );
}

export async function saveFaqsDocument(formData: FormData) {
  const items = [];
  for (let i = 0; i < 12; i += 1) {
    const id = emptyToNull(formData.get(`faqId${i}`));
    const question = emptyToNull(formData.get(`faqQuestion${i}`));
    const answers = lines(formData.get(`faqAnswer${i}`));
    if (!question || answers.length === 0) continue;
    items.push({
      id: id ?? `faq-${i + 1}`,
      question,
      answerParagraphs: answers,
    });
  }
  await saveDocument("faqs", { items }, "Updated FAQs");
}

export async function saveSermonsPageDocument(formData: FormData) {
  const platforms = [];
  for (let i = 0; i < 6; i += 1) {
    const id = emptyToNull(formData.get(`platformId${i}`));
    const name = emptyToNull(formData.get(`platformName${i}`));
    if (!id || !name) continue;
    const href = emptyToNull(formData.get(`platformHref${i}`)) ?? "";
    if (isSilverbirdOwnedHref(href)) {
      redirectWithError(
        "/admin/website/sermons",
        "Silverbird websites cannot be linked from KCMI pages. Leave the link blank and keep the name as plain text.",
      );
    }
    if (href.startsWith("http")) {
      const valid = validateSocialUrl(href);
      if (!valid.ok) {
        redirectWithError("/admin/website/sermons", `${name}: ${valid.error}`);
      }
    }
    platforms.push({
      id: id ?? `platform-${i + 1}`,
      name,
      description: emptyToNull(formData.get(`platformDescription${i}`)),
      href,
      external: href.startsWith("http"),
    });
  }
  await saveDocument(
    "sermons_page",
    {
      headline: emptyToNull(formData.get("headline")),
      sub: emptyToNull(formData.get("sub")),
      sectionTitle: emptyToNull(formData.get("sectionTitle")),
      emptyState: emptyToNull(formData.get("emptyState")),
      platforms,
    },
    "Updated sermons page copy",
  );
}

export async function setFeaturedProgramFromHome(formData: FormData) {
  const programId = emptyToNull(formData.get("featuredProgramId"));
  const gate = await requireStaffAction("website.manage");
  if (!gate.ok) {
    redirectWithError("/admin/website/home", gate.message);
  }
  const publishGate = await requireStaffAction("programs.publish");
  if (!publishGate.ok) {
    redirectWithError("/admin/website/home", publishGate.message);
  }

  const supabase = await createClient();
  const { error: clearError } = await supabase
    .from("programs")
    .update({ placement: "none" })
    .eq("placement", "featured");
  if (clearError) {
    redirectWithError("/admin/website/home", clearError.message);
  }

  if (programId) {
    const { error } = await supabase
      .from("programs")
      .update({ placement: "featured" })
      .eq("id", programId)
      .eq("status", "published");
    if (error) {
      redirectWithError("/admin/website/home", error.message);
    }
  }

  const { data: homeRow } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.home)
    .maybeSingle();

  const { resolveHomeDocument } = await import("@/content/website/resolve");
  const current = resolveHomeDocument(homeRow?.payload ?? {});
  const nextHome = {
    ...current,
    featuredProgramId: programId,
    spotlightTakeoverEnabled:
      formData.get("spotlightTakeoverEnabled") === "on" ||
      formData.get("spotlightTakeoverEnabled") === "true",
    spotlightTakeoverMode:
      emptyToNull(formData.get("spotlightTakeoverMode")) === "once_per_session"
        ? "once_per_session"
        : "once_per_browser",
    spotlightPromoVideoUrl: emptyToNull(formData.get("spotlightPromoVideoUrl")),
    spotlightWindowStart: emptyToNull(formData.get("spotlightWindowStart")),
    spotlightWindowEnd: emptyToNull(formData.get("spotlightWindowEnd")),
  };

  const parsed = parseWebsiteDocumentSave("home", nextHome);
  if (!parsed.ok) {
    redirectWithError("/admin/website/home", parsed.error);
  }

  const { error: homeError } = await supabase
    .from("website_documents")
    .update({
      payload: parsed.payload as Json,
      status: "published",
      updated_by: gate.session.user.id,
      published_at: new Date().toISOString(),
    })
    .eq("id", WEBSITE_DOCUMENT_IDS.home);
  if (homeError) {
    redirectWithError("/admin/website/home", homeError.message);
  }

  await saveRevision({
    entityType: "website_document",
    entityId: WEBSITE_DOCUMENT_IDS.home,
    snapshot: parsed.payload,
    changedBy: gate.session.user.id,
    changeSummary: "Updated KCMI Spotlight on the homepage",
  });

  await writeAuditEvent({
    action: "program.feature_home",
    entityType: "program",
    entityId: programId ?? WEBSITE_DOCUMENT_IDS.home,
    actorId: gate.session.user.id,
    metadata: {
      program_id: programId,
      spotlight_takeover_enabled: nextHome.spotlightTakeoverEnabled,
    },
  });

  redirectWithMessage(
    "/admin/website/home",
    "The KCMI Spotlight on the homepage is now updated.",
  );
}
