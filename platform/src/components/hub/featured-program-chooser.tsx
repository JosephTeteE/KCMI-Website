"use client";

import { useState } from "react";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { HubCheckboxField, HubSelectField, HubSubmitButton, HubTextField } from "@/components/hub/hub-form-fields";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { setFeaturedProgramFromHome } from "@/app/admin/website/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import type { FeaturedProgram } from "@/content/types";
import type { HomeDocument } from "@/content/website/schemas";

const NONE = "__none__";

export function FeaturedProgramChooser({
  featuredProgram,
  programs,
  home,
}: {
  featuredProgram: FeaturedProgram | null;
  programs: FeaturedProgram[];
  home: HomeDocument;
}) {
  const [editing, setEditing] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [takeoverEnabled, setTakeoverEnabled] = useState(
    home.spotlightTakeoverEnabled,
  );
  const [takeoverMode, setTakeoverMode] = useState(home.spotlightTakeoverMode);
  const [promoUrl, setPromoUrl] = useState(home.spotlightPromoVideoUrl ?? "");
  const [windowStart, setWindowStart] = useState(
    home.spotlightWindowStart?.slice(0, 10) ?? "",
  );
  const [windowEnd, setWindowEnd] = useState(
    home.spotlightWindowEnd?.slice(0, 10) ?? "",
  );

  const selected =
    selectedId === NONE
      ? null
      : programs.find((item) => item.id === selectedId) ?? null;
  const previewProgram = editing && selectedId ? selected : featuredProgram;
  const canPublish = editing && previewed && selectedId.length > 0;
  const liveTakeover = editing ? takeoverEnabled : home.spotlightTakeoverEnabled;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">KCMI Spotlight</h2>
      <p className="hub-help text-[var(--color-text-muted)]">
        This is the large program feature on the homepage. Publishing a program
        does not place it here. Choose a published program, then make the
        Spotlight live. You can also show it once when visitors first open the
        website.
      </p>
      <div className="space-y-8">
        <HubPreviewFrame
          title="What visitors will see"
          live={!editing || !selectedId}
        >
          <FeaturedProgramSection program={previewProgram} />
          {!previewProgram ? (
            <p className="p-6 hub-body text-[var(--color-text-muted)]">
              No Spotlight currently shown
            </p>
          ) : null}
          {previewProgram && liveTakeover ? (
            <div className="border-t border-[var(--color-border)] p-4">
              <p className="hub-help mb-3 text-[var(--color-text-muted)]">
                What visitors will see on first open
              </p>
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-4">
                <p className="font-semibold">{previewProgram.title}</p>
                <p className="hub-help mt-1 text-[var(--color-text-muted)]">
                  Visitors may see a one-time spotlight for this program when
                  they open the website
                  {editing
                    ? takeoverMode === "once_per_session"
                      ? " (once per visit)."
                      : " (once on this device)."
                    : home.spotlightTakeoverMode === "once_per_session"
                      ? " (once per visit)."
                      : " (once on this device)."}
                </p>
              </div>
            </div>
          ) : null}
        </HubPreviewFrame>

        <div className="space-y-4">
          <section
            data-hub-role="current"
            className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Currently on the website
            </h3>
            <p className="hub-body" data-readonly="true">
              {featuredProgram?.title ?? "No Spotlight currently shown"}
            </p>
            <p className="hub-help text-[var(--color-text-muted)]">
              First-visit spotlight:{" "}
              {home.spotlightTakeoverEnabled ? "On" : "Off"}
              {home.spotlightTakeoverEnabled
                ? home.spotlightTakeoverMode === "once_per_session"
                  ? " · Show once per visit"
                  : " · Show once on this device"
                : null}
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
              data-tour="change-section"
              onClick={() => {
                setEditing(true);
                setPreviewed(false);
                setSelectedId("");
                setTakeoverEnabled(home.spotlightTakeoverEnabled);
                setTakeoverMode(home.spotlightTakeoverMode);
                setPromoUrl(home.spotlightPromoVideoUrl ?? "");
                setWindowStart(home.spotlightWindowStart?.slice(0, 10) ?? "");
                setWindowEnd(home.spotlightWindowEnd?.slice(0, 10) ?? "");
              }}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
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
              <input
                type="hidden"
                name="spotlightTakeoverEnabled"
                value={takeoverEnabled ? "on" : ""}
              />
              <input type="hidden" name="spotlightTakeoverMode" value={takeoverMode} />
              <input type="hidden" name="spotlightPromoVideoUrl" value={promoUrl} />
              <input
                type="hidden"
                name="spotlightWindowStart"
                value={windowStart ? `${windowStart}T00:00:00.000Z` : ""}
              />
              <input
                type="hidden"
                name="spotlightWindowEnd"
                value={windowEnd ? `${windowEnd}T23:59:59.999Z` : ""}
              />
              <section
                data-hub-role="proposed"
                className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-action-primary)] p-4"
              >
                <HubSelectField
                  id="proposed-featuredProgramId"
                  name="proposed-featuredProgramId"
                  label="Choose a published program"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setPreviewed(false);
                  }}
                >
                  <option value="">Choose a program…</option>
                  <option value={NONE}>None — hide Spotlight</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </HubSelectField>

                <HubCheckboxField
                  id="spotlightTakeoverEnabledUi"
                  label="Feature this when visitors first open the website"
                  hint="Shows a one-time spotlight. Visitors can close it immediately."
                  checked={takeoverEnabled}
                  onChange={(event) => {
                    setTakeoverEnabled(event.target.checked);
                    setPreviewed(false);
                  }}
                />

                <HubSelectField
                  id="spotlightTakeoverModeUi"
                  label="How often should it appear?"
                  value={takeoverMode}
                  onChange={(event) => {
                    setTakeoverMode(
                      event.target.value === "once_per_session"
                        ? "once_per_session"
                        : "once_per_browser",
                    );
                    setPreviewed(false);
                  }}
                >
                  <option value="once_per_browser">Show once on this device</option>
                  <option value="once_per_session">Show once per visit</option>
                </HubSelectField>

                <HubTextField
                  id="spotlightPromoVideoUrlUi"
                  label="Optional promo video link"
                  hint="YouTube or Facebook link only. Leave blank if you do not have one."
                  value={promoUrl}
                  onChange={(event) => {
                    setPromoUrl(event.target.value);
                    setPreviewed(false);
                  }}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <HubTextField
                    id="spotlightWindowStartUi"
                    label="Optional start date"
                    type="date"
                    value={windowStart}
                    onChange={(event) => {
                      setWindowStart(event.target.value);
                      setPreviewed(false);
                    }}
                  />
                  <HubTextField
                    id="spotlightWindowEndUi"
                    label="Optional end date"
                    type="date"
                    value={windowEnd}
                    onChange={(event) => {
                      setWindowEnd(event.target.value);
                      setPreviewed(false);
                    }}
                  />
                </div>
              </section>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-tour="preview-changes"
                  onClick={() => setPreviewed(true)}
                  disabled={!selectedId}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-base font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                >
                  {HUB_ACTION_LABELS.cancelChanges}
                </button>
              </div>
              <div data-tour="make-live">
                <HubSubmitButton
                  variant={canPublish ? "secondary" : "quiet"}
                  disabled={!canPublish}
                >
                  {HUB_ACTION_LABELS.makeFeaturedLive}
                </HubSubmitButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
