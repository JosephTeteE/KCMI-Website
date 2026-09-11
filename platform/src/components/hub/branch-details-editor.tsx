"use client";

import { useState } from "react";
import { BranchPublicDetails } from "@/components/content/branch-public-details";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import {
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { updateBranchPublicFields } from "@/app/admin/branches/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { emptyProposedCopy, mergeProposedCopy } from "@/lib/hub/propose";
import type { Branch } from "@/content/types";

type ServiceRow = { day: string; time: string; note: string };

type Props = {
  id: string;
  current: {
    name: string;
    city_label: string;
    country: string;
    address_lines: string;
    phone_display: string;
    phone_tel: string;
    email: string;
    maps_query: string;
    maps_url: string;
    phone_evidence_note: string;
  };
  currentTimes: ServiceRow[];
};

function emptyTimes(count: number): ServiceRow[] {
  return Array.from({ length: count }, () => ({ day: "", time: "", note: "" }));
}

function previewBranch(values: Props["current"], times: ServiceRow[]): Branch {
  const phones =
    values.phone_display && values.phone_tel
      ? [{ display: values.phone_display, tel: values.phone_tel }]
      : [];
  return {
    id: "preview",
    slug: "preview",
    name: values.name,
    cityLabel: values.city_label,
    country: values.country || null,
    addressLines: values.address_lines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    phones,
    emails: values.email ? [values.email] : [],
    serviceTimes: times
      .filter((row) => row.day.trim() && row.time.trim())
      .map((row) => ({
        day: row.day,
        time: row.time,
        note: row.note.trim() || undefined,
      })),
    mapsQuery: values.maps_query || undefined,
    mapsUrl: values.maps_url || undefined,
  };
}

function mapsHref(values: Props["current"]): string {
  if (values.maps_url) return values.maps_url;
  const q = values.maps_query || values.address_lines.replaceAll("\n", ", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function BranchDetailsEditor({ id, current, currentTimes }: Props) {
  const [editing, setEditing] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [proposed, setProposed] = useState<Props["current"]>(
    emptyProposedCopy(current),
  );
  const [proposedTimes, setProposedTimes] = useState<ServiceRow[]>(
    emptyTimes(Math.max(4, currentTimes.length + 2)),
  );
  const [timesDirty, setTimesDirty] = useState(false);

  const merged = mergeProposedCopy(current, proposed);
  const mergedTimes = timesDirty ? proposedTimes : currentTimes;
  const hasChange =
    Object.values(proposed).some((value) => value.trim().length > 0) || timesDirty;
  const canPublish = editing && previewed && hasChange;
  const previewValues = editing && hasChange ? merged : current;
  const previewTimes = editing && hasChange ? mergedTimes : currentTimes;
  const preview = previewBranch(previewValues, previewTimes);

  function startChange() {
    setEditing(true);
    setPreviewed(false);
    setProposed(emptyProposedCopy(current));
    setProposedTimes(emptyTimes(Math.max(4, currentTimes.length + 2)));
    setTimesDirty(false);
  }

  function cancel() {
    setEditing(false);
    setPreviewed(false);
    setProposed(emptyProposedCopy(current));
    setTimesDirty(false);
  }

  function copyCurrent() {
    setProposed({ ...current });
    setProposedTimes(
      currentTimes.length
        ? [
            ...currentTimes,
            ...emptyTimes(Math.max(2, 4 - currentTimes.length)),
          ]
        : emptyTimes(4),
    );
    setTimesDirty(true);
    setPreviewed(false);
  }

  function setField(key: keyof Props["current"], value: string) {
    setProposed((prev) => ({ ...prev, [key]: value }));
    setPreviewed(false);
  }

  function setTime(index: number, key: keyof ServiceRow, value: string) {
    setProposedTimes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
    setTimesDirty(true);
    setPreviewed(false);
  }

  const timesToSubmit = timesDirty ? proposedTimes : currentTimes;

  return (
    <div className="space-y-8">
      <HubPreviewFrame
        title="Branch page"
        live={!editing || !hasChange}
      >
        <div className="p-4">
          <BranchPublicDetails
            branch={preview}
            mapsHref={mapsHref(previewValues)}
          />
        </div>
      </HubPreviewFrame>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            Branch details
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Address, service times and public contact appear on this branch’s
            page under Locations.
          </p>
        </div>
        <HubHelpDetails summary="Where does this appear?">
          Visitors see this on the public branch page. Making details live
          updates that page.
        </HubHelpDetails>

        <section
          data-hub-role="current"
          className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Currently on the website
          </h3>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Address
            </p>
            <p
              className="mt-1 whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
              data-readonly="true"
            >
              {current.address_lines || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Service times
            </p>
            <ul className="mt-1 space-y-1 rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm">
              {currentTimes.length ? (
                currentTimes.map((row) => (
                  <li key={`${row.day}-${row.time}`}>
                    {row.day}: {row.time}
                    {row.note ? ` — ${row.note}` : ""}
                  </li>
                ))
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Public contact
            </p>
            <p
              className="mt-1 whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
              data-readonly="true"
            >
              {[current.phone_display, current.email].filter(Boolean).join("\n") ||
                "—"}
            </p>
          </div>
        </section>

        {!editing ? (
          <button
            type="button"
            onClick={startChange}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
          >
            {HUB_ACTION_LABELS.changeBranchDetails}
          </button>
        ) : (
          <form
            action={updateBranchPublicFields}
            onSubmit={(event) => {
              if (!canPublish) event.preventDefault();
            }}
            className="space-y-6"
          >
            <input type="hidden" name="id" value={id} />
            {(
              [
                "name",
                "city_label",
                "country",
                "address_lines",
                "phone_display",
                "phone_tel",
                "email",
                "maps_query",
                "maps_url",
                "phone_evidence_note",
              ] as const
            ).map((key) => (
              <input key={key} type="hidden" name={key} value={merged[key]} />
            ))}
            {timesToSubmit.map((row, index) => (
              <span key={`hidden-time-${index}`}>
                <input type="hidden" name="service_day" value={row.day} />
                <input type="hidden" name="service_time" value={row.time} />
                <input type="hidden" name="service_note" value={row.note} />
              </span>
            ))}

            <section
              data-hub-role="proposed"
              className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-action-primary)] p-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                What would you like to show instead?
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Leave a box empty to keep the current website information.
              </p>
              <HubTextField
                id="proposed-name"
                name="proposed-name"
                label="Branch name"
                value={proposed.name}
                onChange={(event) => setField("name", event.target.value)}
              />
              <HubTextField
                id="proposed-city"
                name="proposed-city"
                label="City / area label"
                value={proposed.city_label}
                onChange={(event) => setField("city_label", event.target.value)}
              />
              <HubTextField
                id="proposed-country"
                name="proposed-country"
                label="Country"
                hint="Used to group locations. Leave blank rather than guessing."
                value={proposed.country}
                onChange={(event) => setField("country", event.target.value)}
              />
              <HubTextAreaField
                id="proposed-address"
                name="proposed-address"
                label="Address (one line per row)"
                rows={4}
                value={proposed.address_lines}
                onChange={(event) => setField("address_lines", event.target.value)}
              />
              <HubTextField
                id="proposed-phone-display"
                name="proposed-phone-display"
                label="Phone (display)"
                hint="Leave blank if unknown."
                value={proposed.phone_display}
                onChange={(event) => setField("phone_display", event.target.value)}
              />
              <HubTextField
                id="proposed-phone-tel"
                name="proposed-phone-tel"
                label="Phone (dial link)"
                hint="Digits for tel: links, e.g. +233…"
                value={proposed.phone_tel}
                onChange={(event) => setField("phone_tel", event.target.value)}
              />
              <HubTextField
                id="proposed-email"
                name="proposed-email"
                label="Email"
                type="email"
                value={proposed.email}
                onChange={(event) => setField("email", event.target.value)}
              />
              <HubTextField
                id="proposed-maps-query"
                name="proposed-maps-query"
                label="Maps search query"
                value={proposed.maps_query}
                onChange={(event) => setField("maps_query", event.target.value)}
              />
              <HubTextField
                id="proposed-maps-url"
                name="proposed-maps-url"
                label="Maps URL (optional)"
                value={proposed.maps_url}
                onChange={(event) => setField("maps_url", event.target.value)}
              />
              <HubTextAreaField
                id="proposed-phone-note"
                name="proposed-phone-note"
                label="Phone evidence note (staff)"
                rows={2}
                hint="Internal note about phone source conflicts — not for inventing numbers."
                value={proposed.phone_evidence_note}
                onChange={(event) =>
                  setField("phone_evidence_note", event.target.value)
                }
              />
              <fieldset className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                <legend className="px-1 text-sm font-semibold">
                  Service times
                </legend>
                {proposedTimes.map((row, index) => (
                  <div
                    key={`proposed-service-${index}`}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <HubTextField
                      id={`proposed_service_day_${index}`}
                      name={`proposed_service_day_${index}`}
                      label="Day"
                      value={row.day}
                      onChange={(event) => setTime(index, "day", event.target.value)}
                    />
                    <HubTextField
                      id={`proposed_service_time_${index}`}
                      name={`proposed_service_time_${index}`}
                      label="Time"
                      value={row.time}
                      onChange={(event) => setTime(index, "time", event.target.value)}
                    />
                    <HubTextField
                      id={`proposed_service_note_${index}`}
                      name={`proposed_service_note_${index}`}
                      label="Note"
                      value={row.note}
                      onChange={(event) => setTime(index, "note", event.target.value)}
                    />
                  </div>
                ))}
              </fieldset>
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCurrent}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
              >
                {HUB_ACTION_LABELS.useCurrentInformation}
              </button>
              <button
                type="button"
                onClick={() => setPreviewed(true)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
              >
                {HUB_ACTION_LABELS.previewChanges}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
              >
                {HUB_ACTION_LABELS.cancelChanges}
              </button>
            </div>
            {previewed ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Check the preview. The public branch page does not change until
                you make it live.
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Preview your changes before they appear on the website.
              </p>
            )}
            <HubSubmitButton
              variant={canPublish ? "secondary" : "quiet"}
              disabled={!canPublish}
            >
              {HUB_ACTION_LABELS.saveBranch}
            </HubSubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
