"use client";

import { useEffect, useState } from "react";
import { DiscoverKcmiSection } from "@/components/home/discover-kcmi-section";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { FindFamilySection } from "@/components/home/find-family-section";
import { HomeHero } from "@/components/home/home-hero";
import { PrayerGivingSection } from "@/components/home/prayer-giving-section";
import { WatchListenSection } from "@/components/home/watch-listen-section";
import { FeaturedProgramChooser } from "@/components/hub/featured-program-chooser";
import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import { saveHomeDocument } from "@/app/admin/website/actions";
import { uploadWebsiteContextImage } from "@/app/admin/website/media-actions";
import { isPublicFeaturedProgram } from "@/content/featured-program";
import { livestreamPublic } from "@/content/seed/pages";
import { mapHomePublic } from "@/content/website/public-map";
import type { FeaturedProgram, PublicMediaRef } from "@/content/types";
import type { HomeDocument } from "@/content/website/schemas";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";
import {
  HUB_TOUR_SELECT_CATEGORY_EVENT,
  HUB_TOUR_SELECT_SECTION_EVENT,
} from "@/lib/hub/tour";
import {
  editCategoryTourTarget,
  getHomeVisualSection,
  HOME_VISUAL_SECTIONS,
  homeVisualSectionTourTarget,
  type HomeVisualSectionId,
  type VisualCategoryId,
} from "@/lib/hub/visual-sections";

type Props = {
  home: HomeDocument;
  heroImage: PublicMediaRef;
  welcomeImage: PublicMediaRef;
  programs: FeaturedProgram[];
  featuredProgram: FeaturedProgram | null;
};

type EditorView = "overview" | "section" | "category";

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
    locationsHeading: home.locationsHeading,
    locationsSupporting: home.locationsSupporting,
    spotlightTakeoverEnabled: home.spotlightTakeoverEnabled ? "on" : "",
    spotlightTakeoverMode: home.spotlightTakeoverMode,
    spotlightPromoVideoUrl: home.spotlightPromoVideoUrl ?? "",
    spotlightWindowStart: home.spotlightWindowStart ?? "",
    spotlightWindowEnd: home.spotlightWindowEnd ?? "",
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
    locationsHeading: patch.locationsHeading ?? home.locationsHeading,
    locationsSupporting: patch.locationsSupporting ?? home.locationsSupporting,
  };
  return mapHomePublic(next, heroImage, welcomeImage);
}

export function HomeWebsiteEditor({
  home,
  heroImage,
  welcomeImage,
  programs,
  featuredProgram,
}: Props) {
  const [view, setView] = useState<EditorView>("overview");
  const [sectionId, setSectionId] = useState<HomeVisualSectionId | null>(null);
  const [categoryId, setCategoryId] = useState<VisualCategoryId | null>(null);

  const selectedSection = sectionId ? getHomeVisualSection(sectionId) : undefined;
  const selectedCategory = selectedSection?.categories.find(
    (category) => category.id === categoryId,
  );
  const liveHome = mapHomePublic(home, heroImage, welcomeImage);

  function openSection(id: HomeVisualSectionId) {
    setSectionId(id);
    setCategoryId(null);
    setView("section");
  }

  function openCategory(id: VisualCategoryId) {
    setCategoryId(id);
    setView("category");
  }

  function backToOverview() {
    setView("overview");
    setSectionId(null);
    setCategoryId(null);
  }

  function backToSection() {
    setCategoryId(null);
    setView("section");
  }

  useEffect(() => {
    function onSelectSection(event: Event) {
      const detail = (event as CustomEvent<{ section?: string }>).detail;
      const next = getHomeVisualSection(detail?.section ?? "");
      if (!next) return;
      setSectionId(next.id);
      setCategoryId(null);
      setView("section");
    }
    function onSelectCategory(event: Event) {
      const detail = (event as CustomEvent<{ category?: string }>).detail;
      const next = detail?.category as VisualCategoryId | undefined;
      if (!next) return;
      setCategoryId(next);
      setView("category");
    }
    window.addEventListener(HUB_TOUR_SELECT_SECTION_EVENT, onSelectSection);
    window.addEventListener(HUB_TOUR_SELECT_CATEGORY_EVENT, onSelectCategory);
    return () => {
      window.removeEventListener(HUB_TOUR_SELECT_SECTION_EVENT, onSelectSection);
      window.removeEventListener(HUB_TOUR_SELECT_CATEGORY_EVENT, onSelectCategory);
    };
  }, []);

  if (view === "overview") {
    return (
      <div className="space-y-6" data-tour="home-section-chooser">
        <div>
          <h2 className="text-xl font-semibold">Homepage</h2>
          <p className="hub-help mt-2 text-[var(--color-text-muted)]">
            See each part of the page, then choose what to change.
          </p>
        </div>
        <ul className="grid gap-6">
          {HOME_VISUAL_SECTIONS.map((item) => (
            <li key={item.id}>
              <article
                data-tour={homeVisualSectionTourTarget(item.id)}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 transition-[outline,border-color] hover:border-[var(--color-action-primary)] hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-[var(--color-action-primary)] focus-within:border-[var(--color-action-primary)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-action-primary)]"
              >
                <div className="mb-4">
                  <SectionLivePreview
                    sectionId={item.id}
                    featuredProgram={featuredProgram}
                    liveHome={liveHome}
                  />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-body)]">
                  {item.label}
                </h3>
                <p className="hub-help mt-1 text-[var(--color-text-muted)]">
                  {item.description}
                </p>
                <button
                  type="button"
                  data-tour={
                    item.id === "banner" ? "edit-section" : undefined
                  }
                  onClick={() => openSection(item.id)}
                  className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-[var(--color-text-on-brand)]"
                >
                  Edit this section
                </button>
              </article>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "section" && selectedSection) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <button
            type="button"
            onClick={backToOverview}
            className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            All homepage sections
          </button>
          <h2 className="mt-3 text-xl font-semibold">{selectedSection.label}</h2>
          <p className="hub-help mt-2 text-[var(--color-text-muted)]">
            What would you like to change?
          </p>
        </div>
        <ul className="grid gap-3">
          {selectedSection.categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                data-tour={editCategoryTourTarget(category.id)}
                onClick={() => openCategory(category.id)}
                className="flex min-h-11 w-full cursor-pointer flex-col items-start rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-5 text-left transition-[outline,border-color] hover:border-[var(--color-action-primary)] hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-[var(--color-action-primary)] focus-visible:border-[var(--color-action-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-primary)]"
              >
                <span className="text-lg font-semibold uppercase tracking-wide text-[var(--color-text-body)]">
                  {category.label}
                </span>
                <span className="hub-help mt-1 text-[var(--color-text-muted)]">
                  {category.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "category" && selectedSection && selectedCategory && sectionId) {
    return (
      <div className="space-y-8">
        <div>
          <button
            type="button"
            onClick={backToSection}
            className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            Back to {selectedSection.label} choices
          </button>
          <h2 className="mt-3 text-xl font-semibold">
            {selectedSection.label} — {selectedCategory.label}
          </h2>
          <p className="hub-help mt-1 text-[var(--color-text-muted)]">
            {selectedCategory.description}
          </p>
        </div>

        <CategoryEditor
          sectionId={sectionId}
          categoryId={selectedCategory.id}
          home={home}
          heroImage={heroImage}
          welcomeImage={welcomeImage}
          programs={programs}
          featuredProgram={featuredProgram}
        />
      </div>
    );
  }

  return null;
}

function SectionLivePreview({
  sectionId,
  featuredProgram,
  liveHome,
}: {
  sectionId: HomeVisualSectionId;
  featuredProgram: FeaturedProgram | null;
  liveHome: ReturnType<typeof mapHomePublic>;
}) {
  const section = getHomeVisualSection(sectionId);
  const title = section?.label ?? "Homepage section";

  if (sectionId === "banner") {
    return (
      <HubPreviewFrame title={title} live>
        <HomeHero home={liveHome} />
      </HubPreviewFrame>
    );
  }

  if (sectionId === "spotlight") {
    if (!isPublicFeaturedProgram(featuredProgram)) {
      return (
        <HubPreviewFrame title={title} live>
          <p className="p-8 text-base text-[var(--color-text-muted)]">
            No Spotlight currently shown
          </p>
        </HubPreviewFrame>
      );
    }
    return (
      <HubPreviewFrame title={title} live>
        <FeaturedProgramSection program={featuredProgram} />
      </HubPreviewFrame>
    );
  }

  if (sectionId === "discover") {
    return (
      <HubPreviewFrame title={title} live>
        <DiscoverKcmiSection
          home={liveHome}
          offerings={[]}
          aboutHref="/about"
        />
      </HubPreviewFrame>
    );
  }

  if (sectionId === "watch") {
    return (
      <HubPreviewFrame title={title} live>
        <WatchListenSection
          livestream={{ ...livestreamPublic, isLive: false }}
          sermon={null}
          fallback={liveHome.sermonFallback}
        />
      </HubPreviewFrame>
    );
  }

  if (sectionId === "locations") {
    return (
      <HubPreviewFrame title={title} live>
        <FindFamilySection
          branches={[]}
          heading={liveHome.locationsHeading}
          subheading={liveHome.locationsSupporting}
          allowEmpty
        />
      </HubPreviewFrame>
    );
  }

  return (
    <HubPreviewFrame title={title} live>
      <PrayerGivingSection prayer={liveHome.prayer} giving={liveHome.giving} />
    </HubPreviewFrame>
  );
}

function CategoryEditor({
  sectionId,
  categoryId,
  home,
  heroImage,
  welcomeImage,
  programs,
  featuredProgram,
}: {
  sectionId: HomeVisualSectionId;
  categoryId: VisualCategoryId;
  home: HomeDocument;
  heroImage: PublicMediaRef;
  welcomeImage: PublicMediaRef;
  programs: FeaturedProgram[];
  featuredProgram: FeaturedProgram | null;
}) {
  if (sectionId === "spotlight" && categoryId === "program") {
    return (
      <FeaturedProgramChooser
        featuredProgram={featuredProgram}
        programs={programs}
        home={home}
      />
    );
  }

  if (categoryId === "photo") {
    if (sectionId === "banner") {
      return (
        <ContextPhoto
          copy={HUB_MEDIA_PLACEMENTS.homeTopBanner}
          current={heroImage}
          documentKey="home"
          mediaField="heroMediaId"
          crop="hero"
        />
      );
    }
    if (sectionId === "discover") {
      return (
        <ContextPhoto
          copy={HUB_MEDIA_PLACEMENTS.homeWelcome}
          current={welcomeImage}
          documentKey="home"
          mediaField="welcomeMediaId"
          crop="card"
        />
      );
    }
  }

  if (sectionId === "banner" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Top of Homepage words"
        where="The first message visitors see at the top of the homepage."
        hidden={homeHidden(home, ["heroKicker", "heroHeadline", "heroSupporting"])}
        extraHelp={
          <HubHelpDetails summary="What is this?">
            These are the words in the large section at the top of the homepage.
          </HubHelpDetails>
        }
        fields={[
          { id: "heroKicker", label: "Small line above the title", kind: "text", current: home.heroKicker },
          { id: "heroHeadline", label: "Main title", kind: "text", current: home.heroHeadline },
          { id: "heroSupporting", label: "Supporting message", kind: "textarea", current: home.heroSupporting },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="Top of Homepage" live={mode === "live"}>
            <HomeHero home={previewHome(home, heroImage, welcomeImage, values)} />
          </HubPreviewFrame>
        )}
      />
    );
  }

  if (sectionId === "banner" && categoryId === "buttons") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Top of Homepage buttons"
        where="The two buttons visitors can click at the top of the homepage."
        hidden={homeHidden(home, [
          "heroPrimaryCtaLabel",
          "heroPrimaryCtaHref",
          "heroSecondaryCtaLabel",
          "heroSecondaryCtaHref",
        ])}
        fields={[
          { id: "heroPrimaryCtaLabel", label: "First button visitors can click", kind: "text", current: home.heroPrimaryCtaLabel },
          { id: "heroPrimaryCtaHref", label: "First button destination", kind: "text", current: home.heroPrimaryCtaHref },
          { id: "heroSecondaryCtaLabel", label: "Second button visitors can click", kind: "text", current: home.heroSecondaryCtaLabel },
          { id: "heroSecondaryCtaHref", label: "Second button destination", kind: "text", current: home.heroSecondaryCtaHref },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="Top of Homepage" live={mode === "live"}>
            <HomeHero home={previewHome(home, heroImage, welcomeImage, values)} />
          </HubPreviewFrame>
        )}
      />
    );
  }

  if (sectionId === "discover" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Discover KCMI"
        where="The Discover KCMI welcome message under the top of the homepage."
        hidden={homeHidden(home, ["welcomeEyebrow", "welcomeHeading", "welcomeBody"])}
        fields={[
          { id: "welcomeEyebrow", label: "Small line above the heading", kind: "text", current: home.welcomeEyebrow },
          { id: "welcomeHeading", label: "Heading", kind: "text", current: home.welcomeHeading },
          { id: "welcomeBody", label: "Welcome message", kind: "textarea", current: home.welcomeBody, rows: 5 },
        ]}
        preview={(values, mode) => {
          const mapped = previewHome(home, heroImage, welcomeImage, values);
          return (
            <HubPreviewFrame title="Discover KCMI" live={mode === "live"}>
              <DiscoverKcmiSection
                home={mapped}
                offerings={[]}
                aboutHref="/about"
              />
            </HubPreviewFrame>
          );
        }}
      />
    );
  }

  if (sectionId === "watch" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Watch & Listen"
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
        preview={(values, mode) => {
          const mapped = previewHome(home, heroImage, welcomeImage, values);
          return (
            <HubPreviewFrame title="Watch & Listen" live={mode === "live"}>
              <WatchListenSection
                livestream={{ ...livestreamPublic, isLive: false }}
                sermon={null}
                fallback={mapped.sermonFallback}
              />
            </HubPreviewFrame>
          );
        }}
      />
    );
  }

  if (sectionId === "locations" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Find a Location section"
        where="The homepage invitation that leads visitors to the Locations page."
        hidden={homeHidden(home, ["locationsHeading", "locationsSupporting"])}
        fields={[
          {
            id: "locationsHeading",
            label: "Heading",
            kind: "text",
            current: home.locationsHeading,
          },
          {
            id: "locationsSupporting",
            label: "Supporting message",
            kind: "textarea",
            current: home.locationsSupporting,
            rows: 3,
          },
        ]}
        preview={(values, mode) => {
          const mapped = previewHome(home, heroImage, welcomeImage, values);
          return (
            <HubPreviewFrame title="Find a Location section" live={mode === "live"}>
              <FindFamilySection
                branches={[]}
                heading={mapped.locationsHeading}
                subheading={mapped.locationsSupporting}
                allowEmpty
              />
              <p className="px-6 pb-4 hub-help text-[var(--color-text-muted)]">
                Preview uses your wording. Live location counts come from
                published branches.
              </p>
            </HubPreviewFrame>
          );
        }}
      />
    );
  }

  if (sectionId === "prayer-giving" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveHomeDocument}
        what="Prayer & Giving"
        where="The prayer and giving invitation near the bottom of the homepage."
        hidden={homeHidden(home, [
          "prayerHeading",
          "prayerVerse",
          "prayerVerseReference",
          "prayerBody",
          "prayerCtaLabel",
          "prayerCtaHref",
          "givingHeading",
          "givingVerse",
          "givingVerseReference",
          "givingCtaLabel",
          "givingCtaHref",
        ])}
        fields={[
          { id: "prayerHeading", label: "Prayer heading", kind: "text", current: home.prayerHeading },
          { id: "prayerVerse", label: "Prayer Bible verse", kind: "text", current: home.prayerVerse },
          { id: "prayerVerseReference", label: "Prayer verse reference", kind: "text", current: home.prayerVerseReference },
          { id: "prayerBody", label: "Prayer message (one paragraph per line)", kind: "textarea", current: home.prayerBody.join("\n"), rows: 5 },
          { id: "prayerCtaLabel", label: "Prayer button visitors can click", kind: "text", current: home.prayerCtaLabel },
          { id: "prayerCtaHref", label: "Prayer button destination", kind: "text", current: home.prayerCtaHref },
          { id: "givingHeading", label: "Giving heading", kind: "text", current: home.givingHeading },
          { id: "givingVerse", label: "Giving Bible verse", kind: "text", current: home.givingVerse },
          { id: "givingVerseReference", label: "Giving verse reference", kind: "text", current: home.givingVerseReference },
          { id: "givingCtaLabel", label: "Giving button visitors can click", kind: "text", current: home.givingCtaLabel },
          { id: "givingCtaHref", label: "Giving button destination", kind: "text", current: home.givingCtaHref },
        ]}
        preview={(values, mode) => {
          const mapped = previewHome(home, heroImage, welcomeImage, values);
          return (
            <HubPreviewFrame title="Prayer & Giving" live={mode === "live"}>
              <PrayerGivingSection prayer={mapped.prayer} giving={mapped.giving} />
            </HubPreviewFrame>
          );
        }}
      />
    );
  }

  return (
    <p className="hub-help text-[var(--color-text-muted)]">
      This part of the homepage cannot be edited here.
    </p>
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
      <p className="hub-help text-[var(--color-text-muted)]">{copy.where}</p>
      <p className="hub-help text-[var(--color-text-muted)]">{copy.recommended}</p>
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
