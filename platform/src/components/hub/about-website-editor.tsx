"use client";

import { useState } from "react";
import {
  ContextualPhotoEditor,
  type ContextualPhotoSelection,
} from "@/components/hub/contextual-photo-editor";
import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import type { MediaChooserItem } from "@/components/hub/media-chooser";
import { saveAboutDocument } from "@/app/admin/website/actions";
import {
  assignWebsiteContextImage,
  stageWebsiteContextImage,
} from "@/app/admin/website/media-actions";
import type { PublicMediaRef } from "@/content/types";
import type { AboutDocument } from "@/content/website/schemas";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";
import {
  ABOUT_VISUAL_SECTIONS,
  editCategoryTourTarget,
  getAboutVisualSection,
  type AboutVisualSectionId,
  type VisualCategoryId,
} from "@/lib/hub/visual-sections";

type EditorView = "overview" | "section" | "category";

export type AboutStagedPhoto = {
  field: string;
  asset: ContextualPhotoSelection;
};

export function AboutWebsiteEditor({
  about,
  portrait,
  photoLibrary,
  stagedPhoto,
}: {
  about: AboutDocument;
  portrait: PublicMediaRef;
  photoLibrary: MediaChooserItem[];
  stagedPhoto: AboutStagedPhoto | null;
}) {
  const openPortrait = stagedPhoto?.field === "portraitMediaId";
  const [view, setView] = useState<EditorView>(
    openPortrait ? "category" : "overview",
  );
  const [sectionId, setSectionId] = useState<AboutVisualSectionId | null>(
    openPortrait ? "portrait" : null,
  );
  const [categoryId, setCategoryId] = useState<VisualCategoryId | null>(
    openPortrait ? "photo" : null,
  );

  const selectedSection = sectionId ? getAboutVisualSection(sectionId) : undefined;
  const selectedCategory = selectedSection?.categories.find(
    (category) => category.id === categoryId,
  );

  function openSection(id: AboutVisualSectionId) {
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

  if (view === "overview") {
    return (
      <div className="space-y-6" data-tour="about-section-chooser">
        <div>
          <h2 className="text-xl font-semibold">About KCMI</h2>
          <p className="hub-help mt-2 text-[var(--color-text-muted)]">
            See each part of the About page, then choose what to change.
          </p>
        </div>
        <ul className="grid gap-6">
          {ABOUT_VISUAL_SECTIONS.map((item) => (
            <li key={item.id}>
              <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 transition-[outline,border-color] hover:border-[var(--color-action-primary)] hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-[var(--color-action-primary)] focus-within:border-[var(--color-action-primary)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-action-primary)]">
                <div className="mb-4">
                  <AboutSectionPreview
                    sectionId={item.id}
                    about={about}
                    portrait={portrait}
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
            All About sections
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
        </div>
        <AboutCategoryEditor
          sectionId={sectionId}
          categoryId={selectedCategory.id}
          about={about}
          portrait={portrait}
          photoLibrary={photoLibrary}
          stagedPhoto={stagedPhoto}
        />
      </div>
    );
  }

  return null;
}

function AboutSectionPreview({
  sectionId,
  about,
  portrait,
}: {
  sectionId: AboutVisualSectionId;
  about: AboutDocument;
  portrait: PublicMediaRef;
}) {
  if (sectionId === "who-we-are") {
    return (
      <HubPreviewFrame title="Who We Are" live>
        <div className="space-y-3 p-6">
          <h3 className="font-display text-2xl font-semibold">Who We Are</h3>
          {about.whoWeAre.slice(0, 2).map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-sm text-[var(--color-text-muted)]">
              {paragraph}
            </p>
          ))}
        </div>
      </HubPreviewFrame>
    );
  }

  if (sectionId === "vision-mission") {
    return (
      <HubPreviewFrame title="Vision & Mission" live>
        <div className="space-y-4 p-6">
          <h3 className="font-display text-xl font-semibold">Our Vision</h3>
          <p className="text-sm font-semibold text-[var(--color-action-primary)]">
            {about.vision}
          </p>
          <h3 className="font-display text-xl font-semibold">Our Mission</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {about.missionParagraphs[0]}
          </p>
        </div>
      </HubPreviewFrame>
    );
  }

  if (sectionId === "leadership") {
    return (
      <HubPreviewFrame title="Leadership" live>
        <div className="space-y-2 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-action-primary)]">
            Leadership
          </p>
          <h3 className="font-display text-2xl font-semibold">
            {about.leadershipName}
          </h3>
          <p className="text-sm font-semibold">{about.leadershipRole}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {about.leadershipPreview}
          </p>
        </div>
      </HubPreviewFrame>
    );
  }

  return (
    <HubPreviewFrame title="Lead Pastor Photo" live>
      <div className="flex justify-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portrait.src}
          alt={portrait.alt || "Lead Pastor photo"}
          className="max-w-xs rounded-[var(--radius-md)] object-cover"
        />
      </div>
    </HubPreviewFrame>
  );
}

function AboutCategoryEditor({
  sectionId,
  categoryId,
  about,
  portrait,
  photoLibrary,
  stagedPhoto,
}: {
  sectionId: AboutVisualSectionId;
  categoryId: VisualCategoryId;
  about: AboutDocument;
  portrait: PublicMediaRef;
  photoLibrary: MediaChooserItem[];
  stagedPhoto: AboutStagedPhoto | null;
}) {
  const hiddenBase = {
    portraitMediaId: about.portraitMediaId ?? "",
    whoWeAre: about.whoWeAre.join("\n"),
    vision: about.vision,
    missionParagraphs: about.missionParagraphs.join("\n"),
    leadershipName: about.leadershipName,
    leadershipRole: about.leadershipRole,
    leadershipOrgLine: about.leadershipOrgLine,
    leadershipHeadquarters: about.leadershipHeadquarters,
    leadershipPreview: about.leadershipPreview,
    portraitAlt: about.portraitAlt,
    bioParagraphs: about.bioParagraphs.join("\n"),
  };

  function hiddenExcept(keys: string[]): Record<string, string> {
    const next = { ...hiddenBase };
    for (const key of keys) delete next[key as keyof typeof next];
    return next;
  }

  if (sectionId === "portrait" && categoryId === "photo") {
    const copy = HUB_MEDIA_PLACEMENTS.aboutPortrait;
    return (
      <ContextualPhotoEditor
        title={copy.title}
        where={copy.where}
        recommended={copy.recommended}
        cropAspect="square"
        current={{ src: portrait.src, alt: portrait.alt }}
        currentMediaId={about.portraitMediaId}
        library={photoLibrary}
        staged={
          stagedPhoto?.field === "portraitMediaId" ? stagedPhoto.asset : null
        }
        uploadAction={stageWebsiteContextImage}
        assignAction={assignWebsiteContextImage}
        hiddenFields={{
          document_key: "about",
          media_field: "portraitMediaId",
        }}
      />
    );
  }

  if (sectionId === "who-we-are" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveAboutDocument}
        what="Who We Are"
        where="The Who We Are introduction on the About KCMI page."
        hidden={hiddenExcept(["whoWeAre"])}
        extraHelp={
          <HubHelpDetails summary="What is this?">
            Keep this faithful to KCMI. Do not invent church history.
          </HubHelpDetails>
        }
        fields={[
          {
            id: "whoWeAre",
            label: "Who we are (one paragraph per line)",
            kind: "textarea",
            current: about.whoWeAre.join("\n"),
            rows: 6,
          },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="Who We Are" live={mode === "live"}>
            <div className="space-y-3 p-6">
              <h3 className="font-display text-2xl font-semibold">Who We Are</h3>
              <p className="whitespace-pre-wrap text-sm">{values.whoWeAre}</p>
            </div>
          </HubPreviewFrame>
        )}
      />
    );
  }

  if (sectionId === "vision-mission" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveAboutDocument}
        what="Vision & Mission"
        where="Vision and mission on the About KCMI page."
        hidden={hiddenExcept(["vision", "missionParagraphs"])}
        extraHelp={
          <HubHelpDetails summary="What is this?">
            Keep vision and mission faithful to KCMI wording.
          </HubHelpDetails>
        }
        fields={[
          { id: "vision", label: "Vision", kind: "text", current: about.vision },
          {
            id: "missionParagraphs",
            label: "Mission (one paragraph per line)",
            kind: "textarea",
            current: about.missionParagraphs.join("\n"),
            rows: 6,
          },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="Vision & Mission" live={mode === "live"}>
            <div className="space-y-4 p-6">
              <h3 className="font-display text-xl font-semibold">Our Vision</h3>
              <p className="text-sm">{values.vision}</p>
              <h3 className="font-display text-xl font-semibold">Our Mission</h3>
              <p className="whitespace-pre-wrap text-sm">{values.missionParagraphs}</p>
            </div>
          </HubPreviewFrame>
        )}
      />
    );
  }

  if (sectionId === "leadership" && categoryId === "words") {
    return (
      <HubCopyProposeForm
        action={saveAboutDocument}
        what="Leadership"
        where="Lead pastor introduction and biography on the About pages."
        hidden={hiddenExcept([
          "leadershipName",
          "leadershipRole",
          "leadershipOrgLine",
          "leadershipHeadquarters",
          "leadershipPreview",
          "portraitAlt",
          "bioParagraphs",
        ])}
        fields={[
          { id: "leadershipName", label: "Lead pastor name", kind: "text", current: about.leadershipName },
          { id: "leadershipRole", label: "Role", kind: "text", current: about.leadershipRole },
          { id: "leadershipOrgLine", label: "Organisation line", kind: "text", current: about.leadershipOrgLine },
          { id: "leadershipHeadquarters", label: "Headquarters", kind: "text", current: about.leadershipHeadquarters },
          { id: "leadershipPreview", label: "Short leadership introduction", kind: "textarea", current: about.leadershipPreview },
          { id: "portraitAlt", label: "Photo description for people who cannot see it", kind: "text", current: about.portraitAlt },
          { id: "bioParagraphs", label: "Full biography (one paragraph per line)", kind: "textarea", current: about.bioParagraphs.join("\n"), rows: 10 },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="Leadership" live={mode === "live"}>
            <div className="space-y-2 p-6">
              <p className="text-sm font-semibold">{values.leadershipName}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {values.leadershipRole}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {values.leadershipPreview}
              </p>
            </div>
          </HubPreviewFrame>
        )}
      />
    );
  }

  return (
    <p className="hub-help text-[var(--color-text-muted)]">
      This part of the About page cannot be edited here.
    </p>
  );
}
