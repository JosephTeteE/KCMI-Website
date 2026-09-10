"use client";

import { useState } from "react";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { HubSelectField, HubSubmitButton } from "@/components/hub/hub-form-fields";
import { setFeaturedProgramFromHome } from "@/app/admin/website/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import type { FeaturedProgram } from "@/content/types";

const NONE = "__none__";

export function FeaturedProgramChooser({
  featuredProgram,
  programs,
}: {
  featuredProgram: FeaturedProgram | null;
  programs: FeaturedProgram[];
}) {
  const [editing, setEditing] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const selected =
    selectedId === NONE
      ? null
      : programs.find((item) => item.id === selectedId) ?? null;
  const previewProgram = editing && selectedId ? selected : featuredProgram;
  const canPublish = editing && previewed && selectedId.length > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Featured program on the homepage</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        This is the large program card on the homepage. If none is chosen, that
        section is hidden.
      </p>
      <div className="space-y-8">
        <HubPreviewFrame
          title="Featured program"
          live={!editing || !selectedId}
        >
          <FeaturedProgramSection program={previewProgram} />
          {!previewProgram ? (
            <p className="p-6 text-sm text-[var(--color-text-muted)]">
              No featured program is showing on the homepage.
            </p>
          ) : null}
        </HubPreviewFrame>

        <div className="space-y-4">
          <section
            data-hub-role="current"
            className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Currently featured
            </h3>
            <p className="text-sm" data-readonly="true">
              {featuredProgram?.title ?? "No program featured"}
            </p>
          </section>

          <HubHelpDetails summary="What is this?">
            Only programs that are already live can appear here. Making a
            program live is done under Programs & Announcements. Choosing a
            program here does not change the public homepage until you make it
            live.
          </HubHelpDetails>

          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setPreviewed(false);
                setSelectedId("");
              }}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
            >
              {HUB_ACTION_LABELS.changeFeaturedProgram}
            </button>
          ) : (
            <form
              action={setFeaturedProgramFromHome}
              onSubmit={(event) => {
                if (!canPublish) event.preventDefault();
              }}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="featuredProgramId"
                value={selectedId === NONE ? "" : selectedId}
              />
              <section
                data-hub-role="proposed"
                className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-action-primary)] p-4"
              >
                <HubSelectField
                  id="proposed-featuredProgramId"
                  name="proposed-featuredProgramId"
                  label="Which published program should appear?"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setPreviewed(false);
                  }}
                >
                  <option value="">Choose a program…</option>
                  <option value={NONE}>None — hide this section</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </HubSelectField>
              </section>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewed(true)}
                  disabled={!selectedId}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Preview homepage section
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setPreviewed(false);
                    setSelectedId("");
                  }}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                >
                  {HUB_ACTION_LABELS.cancelChanges}
                </button>
              </div>
              <HubSubmitButton
                variant={canPublish ? "secondary" : "quiet"}
                disabled={!canPublish}
              >
                {HUB_ACTION_LABELS.makeFeaturedLive}
              </HubSubmitButton>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
