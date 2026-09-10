"use client";

import { useState } from "react";
import { HomeHero } from "@/components/home/home-hero";
import { WelcomeSection } from "@/components/home/welcome-section";
import { FeaturedProgramChooser } from "@/components/hub/featured-program-chooser";
import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import {
  saveHomeDocument,
} from "@/app/admin/website/actions";
import { uploadWebsiteContextImage } from "@/app/admin/website/media-actions";
import { mapHomePublic } from "@/content/website/public-map";
import type { FeaturedProgram, PublicMediaRef } from "@/content/types";
import type { HomeDocument } from "@/content/website/schemas";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";

type Props = {
  home: HomeDocument;
  heroImage: PublicMediaRef;
  welcomeImage: PublicMediaRef;
  programs: FeaturedProgram[];
  featuredProgram: FeaturedProgram | null;
  legalName: string;
  alternateName: string;
};

function homeHidden(home: HomeDocument, skip: string[]): Record<string, string> {
  const all: Record<string, string> = {
    heroKicker: home.heroKicker,
    heroHeadline: home.heroHeadline,
    heroSupporting: home.heroSupporting,
    heroPrimaryCtaLabel: home.heroPrimaryCtaLabel,
    heroPrimaryCtaHref: home.heroPrimaryCtaHref,
    heroSecondaryCtaLabel: home.heroSecondaryCtaLabel,
    heroSecondaryCtaHref: home.heroSecondaryCtaHref,
    heroMediaId: home.heroMediaId ?? "",
    welcomeEyebrow: home.welcomeEyebrow,
    welcomeHeading: home.welcomeHeading,
    welcomeBody: home.welcomeBody,
    welcomeMediaId: home.welcomeMediaId ?? "",
    prayerHeading: home.prayerHeading,
    prayerVerse: home.prayerVerse,
    prayerVerseReference: home.prayerVerseReference,
    prayerBody: home.prayerBody.join("\n"),
    prayerCtaLabel: home.prayerCtaLabel,
    prayerCtaHref: home.prayerCtaHref,
    givingHeading: home.givingHeading,
    givingVerse: home.givingVerse,
    givingVerseReference: home.givingVerseReference,
    givingCtaLabel: home.givingCtaLabel,
    givingCtaHref: home.givingCtaHref,
    sermonFallbackTitle: home.sermonFallbackTitle,
    sermonFallbackDescription: home.sermonFallbackDescription,
    sermonFallbackCtaLabel: home.sermonFallbackCtaLabel,
    sermonFallbackCtaHref: home.sermonFallbackCtaHref,
    sermonFallbackYoutubeUrl: home.sermonFallbackYoutubeUrl,
    sermonFallbackYoutubeLabel: home.sermonFallbackYoutubeLabel,
    featuredProgramId: home.featuredProgramId ?? "",
  };
  for (const key of skip) delete all[key];
  return all;
}

function previewHome(
  home: HomeDocument,
  heroImage: PublicMediaRef,
  welcomeImage: PublicMediaRef,
  patch: Record<string, string>,
) {
  const next: HomeDocument = {
    ...home,
    heroKicker: patch.heroKicker ?? home.heroKicker,
    heroHeadline: patch.heroHeadline ?? home.heroHeadline,
    heroSupporting: patch.heroSupporting ?? home.heroSupporting,
    heroPrimaryCtaLabel: patch.heroPrimaryCtaLabel ?? home.heroPrimaryCtaLabel,
    heroPrimaryCtaHref: patch.heroPrimaryCtaHref ?? home.heroPrimaryCtaHref,
    heroSecondaryCtaLabel: patch.heroSecondaryCtaLabel ?? home.heroSecondaryCtaLabel,
    heroSecondaryCtaHref: patch.heroSecondaryCtaHref ?? home.heroSecondaryCtaHref,
    welcomeEyebrow: patch.welcomeEyebrow ?? home.welcomeEyebrow,
    welcomeHeading: patch.welcomeHeading ?? home.welcomeHeading,
    welcomeBody: patch.welcomeBody ?? home.welcomeBody,
    prayerHeading: patch.prayerHeading ?? home.prayerHeading,
    prayerVerse: patch.prayerVerse ?? home.prayerVerse,
    prayerVerseReference: patch.prayerVerseReference ?? home.prayerVerseReference,
    prayerBody:
      patch.prayerBody !== undefined
        ? patch.prayerBody.split("\n").map((line) => line.trim()).filter(Boolean)
        : home.prayerBody,
    prayerCtaLabel: patch.prayerCtaLabel ?? home.prayerCtaLabel,
    prayerCtaHref: patch.prayerCtaHref ?? home.prayerCtaHref,
    givingHeading: patch.givingHeading ?? home.givingHeading,
    givingVerse: patch.givingVerse ?? home.givingVerse,
    givingVerseReference: patch.givingVerseReference ?? home.givingVerseReference,
    givingCtaLabel: patch.givingCtaLabel ?? home.givingCtaLabel,
    givingCtaHref: patch.givingCtaHref ?? home.givingCtaHref,
    sermonFallbackTitle: patch.sermonFallbackTitle ?? home.sermonFallbackTitle,
    sermonFallbackDescription:
      patch.sermonFallbackDescription ?? home.sermonFallbackDescription,
    sermonFallbackCtaLabel: patch.sermonFallbackCtaLabel ?? home.sermonFallbackCtaLabel,
    sermonFallbackCtaHref: patch.sermonFallbackCtaHref ?? home.sermonFallbackCtaHref,
    sermonFallbackYoutubeUrl:
      patch.sermonFallbackYoutubeUrl ?? home.sermonFallbackYoutubeUrl,
    sermonFallbackYoutubeLabel:
      patch.sermonFallbackYoutubeLabel ?? home.sermonFallbackYoutubeLabel,
  };
  return mapHomePublic(next, heroImage, welcomeImage);
}

type HomeSection =
  | "banner"
  | "welcome"
  | "featured"
  | "prayer"
  | "giving"
  | "sermons";

const HOME_SECTIONS: {
  id: HomeSection;
  title: string;
  summary: string;
}[] = [
  {
    id: "banner",
    title: "Top Banner",
    summary: "First message and photo visitors see",
  },
  {
    id: "welcome",
    title: "Welcome",
    summary: "Church welcome message and photo",
  },
  {
    id: "featured",
    title: "Featured Program",
    summary: "Program highlighted on the homepage",
  },
  {
    id: "prayer",
    title: "Prayer Invitation",
    summary: "Prayer section on the homepage",
  },
  {
    id: "giving",
    title: "Giving Invitation",
    summary: "Giving section on the homepage",
  },
  {
    id: "sermons",
    title: "Sermons & Media",
    summary: "Sermon highlight used when no sermon is featured",
  },
];

export function HomeWebsiteEditor({
  home,
  heroImage,
  welcomeImage,
  programs,
  featuredProgram,
  legalName,
  alternateName,
}: Props) {
  const [section, setSection] = useState<HomeSection | "index">("index");
  const selected = HOME_SECTIONS.find((item) => item.id === section);

  if (section === "index") {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Homepage</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            What would you like to change?
          </p>
        </div>
        <ul className="grid gap-3">
          {HOME_SECTIONS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSection(item.id)}
                className="flex min-h-11 w-full flex-col items-start rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 text-left hover:border-[var(--color-action-primary)]"
              >
                <span className="text-sm font-semibold text-[var(--color-text-body)]">
                  {item.title}
                </span>
                <span className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {item.summary}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={() => setSection("index")}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          All homepage sections
        </button>
        <h2 className="mt-3 text-xl font-semibold">{selected?.title}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {selected?.summary}
        </p>
      </div>

      {section === "featured" ? (
        <FeaturedProgramChooser
          featuredProgram={featuredProgram}
          programs={programs}
        />
      ) : null}

      {section === "banner" ? (
        <>
          <ContextPhoto
            copy={HUB_MEDIA_PLACEMENTS.homeTopBanner}
            current={heroImage}
            documentKey="home"
            mediaField="heroMediaId"
            crop="hero"
          />

          <HubCopyProposeForm
            action={saveHomeDocument}
            what="Homepage Top Banner"
            where="The large section visitors see first when they open the website."
            hidden={homeHidden(home, [
              "heroKicker",
              "heroHeadline",
              "heroSupporting",
              "heroPrimaryCtaLabel",
              "heroPrimaryCtaHref",
              "heroSecondaryCtaLabel",
              "heroSecondaryCtaHref",
            ])}
            extraHelp={
              <HubHelpDetails summary="What is this?">
                This is the first message and the two buttons at the top of the
                homepage.
              </HubHelpDetails>
            }
            fields={[
              { id: "heroKicker", label: "Small line above the title", kind: "text", current: home.heroKicker },
              { id: "heroHeadline", label: "Main title", kind: "text", current: home.heroHeadline },
              { id: "heroSupporting", label: "Supporting message", kind: "textarea", current: home.heroSupporting },
              { id: "heroPrimaryCtaLabel", label: "First button visitors can click", kind: "text", current: home.heroPrimaryCtaLabel },
              { id: "heroPrimaryCtaHref", label: "First button destination", kind: "text", current: home.heroPrimaryCtaHref },
              { id: "heroSecondaryCtaLabel", label: "Second button visitors can click", kind: "text", current: home.heroSecondaryCtaLabel },
              { id: "heroSecondaryCtaHref", label: "Second button destination", kind: "text", current: home.heroSecondaryCtaHref },
            ]}
            preview={(values, mode) => (
              <HubPreviewFrame title="Homepage Top Banner" live={mode === "live"}>
                <HomeHero home={previewHome(home, heroImage, welcomeImage, values)} />
              </HubPreviewFrame>
            )}
          />
        </>
      ) : null}

      {section === "welcome" ? (
        <>
          <ContextPhoto
            copy={HUB_MEDIA_PLACEMENTS.homeWelcome}
            current={welcomeImage}
            documentKey="home"
            mediaField="welcomeMediaId"
            crop="card"
          />

          <HubCopyProposeForm
            action={saveHomeDocument}
            what="Homepage Welcome"
            where="The welcome message under the top banner on the homepage."
            hidden={homeHidden(home, ["welcomeEyebrow", "welcomeHeading", "welcomeBody"])}
            fields={[
              { id: "welcomeEyebrow", label: "Small line above the heading", kind: "text", current: home.welcomeEyebrow },
              { id: "welcomeHeading", label: "Heading", kind: "text", current: home.welcomeHeading },
              { id: "welcomeBody", label: "Welcome message", kind: "textarea", current: home.welcomeBody, rows: 5 },
            ]}
            preview={(values, mode) => (
              <HubPreviewFrame title="Welcome" live={mode === "live"}>
                <WelcomeSection
                  home={previewHome(home, heroImage, welcomeImage, values)}
                  legalName={legalName}
                  alternateName={alternateName}
                />
              </HubPreviewFrame>
            )}
          />
        </>
      ) : null}

      {section === "prayer" ? (
        <HubCopyProposeForm
          action={saveHomeDocument}
          what="Prayer invitation"
          where="The prayer section on the homepage."
          hidden={homeHidden(home, [
            "prayerHeading",
            "prayerVerse",
            "prayerVerseReference",
            "prayerBody",
            "prayerCtaLabel",
            "prayerCtaHref",
          ])}
          fields={[
            { id: "prayerHeading", label: "Heading", kind: "text", current: home.prayerHeading },
            { id: "prayerVerse", label: "Bible verse", kind: "text", current: home.prayerVerse },
            { id: "prayerVerseReference", label: "Verse reference", kind: "text", current: home.prayerVerseReference },
            { id: "prayerBody", label: "Message (one paragraph per line)", kind: "textarea", current: home.prayerBody.join("\n"), rows: 5 },
            { id: "prayerCtaLabel", label: "Button visitors can click", kind: "text", current: home.prayerCtaLabel },
            { id: "prayerCtaHref", label: "Button destination", kind: "text", current: home.prayerCtaHref },
          ]}
          preview={(values, mode) => (
            <HubPreviewFrame title="Prayer invitation" live={mode === "live"}>
              <SimpleCtaPreview
                heading={values.prayerHeading}
                verse={values.prayerVerse}
                reference={values.prayerVerseReference}
                body={values.prayerBody}
                button={values.prayerCtaLabel}
              />
            </HubPreviewFrame>
          )}
        />
      ) : null}

      {section === "giving" ? (
        <HubCopyProposeForm
          action={saveHomeDocument}
          what="Giving invitation"
          where="The giving section on the homepage."
          hidden={homeHidden(home, [
            "givingHeading",
            "givingVerse",
            "givingVerseReference",
            "givingCtaLabel",
            "givingCtaHref",
          ])}
          fields={[
            { id: "givingHeading", label: "Heading", kind: "text", current: home.givingHeading },
            { id: "givingVerse", label: "Bible verse", kind: "text", current: home.givingVerse },
            { id: "givingVerseReference", label: "Verse reference", kind: "text", current: home.givingVerseReference },
            { id: "givingCtaLabel", label: "Button visitors can click", kind: "text", current: home.givingCtaLabel },
            { id: "givingCtaHref", label: "Button destination", kind: "text", current: home.givingCtaHref },
          ]}
          preview={(values, mode) => (
            <HubPreviewFrame title="Giving invitation" live={mode === "live"}>
              <SimpleCtaPreview
                heading={values.givingHeading}
                verse={values.givingVerse}
                reference={values.givingVerseReference}
                body=""
                button={values.givingCtaLabel}
              />
            </HubPreviewFrame>
          )}
        />
      ) : null}

      {section === "sermons" ? (
        <HubCopyProposeForm
          action={saveHomeDocument}
          what="Sermon highlight (when no sermon is featured)"
          where="Used on the homepage only when no published sermon is featured."
          hidden={homeHidden(home, [
            "sermonFallbackTitle",
            "sermonFallbackDescription",
            "sermonFallbackCtaLabel",
            "sermonFallbackCtaHref",
            "sermonFallbackYoutubeUrl",
            "sermonFallbackYoutubeLabel",
          ])}
          fields={[
            { id: "sermonFallbackTitle", label: "Title", kind: "text", current: home.sermonFallbackTitle },
            { id: "sermonFallbackDescription", label: "Description", kind: "textarea", current: home.sermonFallbackDescription },
            { id: "sermonFallbackCtaLabel", label: "Button visitors can click", kind: "text", current: home.sermonFallbackCtaLabel },
            { id: "sermonFallbackCtaHref", label: "Button destination", kind: "text", current: home.sermonFallbackCtaHref },
            { id: "sermonFallbackYoutubeUrl", label: "YouTube link", kind: "text", current: home.sermonFallbackYoutubeUrl },
            { id: "sermonFallbackYoutubeLabel", label: "YouTube button label", kind: "text", current: home.sermonFallbackYoutubeLabel },
          ]}
          preview={(values, mode) => (
            <HubPreviewFrame title="Sermon highlight fallback" live={mode === "live"}>
              <SimpleCtaPreview
                heading={values.sermonFallbackTitle}
                verse=""
                reference=""
                body={values.sermonFallbackDescription}
                button={values.sermonFallbackCtaLabel}
              />
            </HubPreviewFrame>
          )}
        />
      ) : null}
    </div>
  );
}

function ContextPhoto({
  copy,
  current,
  documentKey,
  mediaField,
  crop,
}: {
  copy: (typeof HUB_MEDIA_PLACEMENTS)[keyof typeof HUB_MEDIA_PLACEMENTS];
  current: PublicMediaRef;
  documentKey: "home" | "about";
  mediaField: string;
  crop: "hero" | "card" | "square";
}) {
  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-[var(--color-text-muted)]">{copy.where}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{copy.recommended}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <div data-hub-role="current">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Current photo
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={current.alt || "Current website photo"}
            className="w-full rounded-[var(--radius-md)] object-cover"
          />
        </div>
        <MarketingImageUploader
          action={uploadWebsiteContextImage}
          submitLabel="Replace Photo"
          defaultCropAspect={crop}
          lockCropAspect
          placementTitle={copy.title}
          extraFields={
            <>
              <input type="hidden" name="document_key" value={documentKey} />
              <input type="hidden" name="media_field" value={mediaField} />
            </>
          }
        />
      </div>
    </section>
  );
}

function SimpleCtaPreview({
  heading,
  verse,
  reference,
  body,
  button,
}: {
  heading: string;
  verse: string;
  reference: string;
  body: string;
  button: string;
}) {
  return (
    <div className="space-y-3 p-6">
      <h3 className="font-display text-2xl font-semibold">{heading}</h3>
      {verse ? <p className="italic">{verse}</p> : null}
      {reference ? <p className="text-sm text-[var(--color-text-muted)]">{reference}</p> : null}
      {body ? <p className="whitespace-pre-wrap text-sm">{body}</p> : null}
      {button ? (
        <p className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-4 text-sm font-semibold text-[var(--color-action-secondary-fg)]">
          {button}
        </p>
      ) : null}
    </div>
  );
}
