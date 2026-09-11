"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  HubCheckboxField,
  HubSelectField,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  emptyProposedCopy,
  hasProposedCopy,
  mergeProposedCopy,
} from "@/lib/hub/propose";
import {
  hubCurrentSectionCopy,
  type HubPublicationState,
} from "@/lib/hub/publication-copy";
import { HUB_TOUR_START_CHANGE_EVENT } from "@/lib/hub/tour";
export type HubCopyField = {
  id: string;
  label: string;
  kind: "text" | "textarea" | "date" | "select" | "checkbox";
  current: string;
  required?: boolean;
  rows?: number;
  hint?: string;
  options?: { value: string; label: string }[];
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  what: string;
  where: string;
  fields: HubCopyField[];
  hidden?: Record<string, string>;
  preview: (values: Record<string, string>, mode: "live" | "proposed") => ReactNode;
  liveLabel?: string;
  changeLabel?: string;
  copyCurrentLabel?: string;
  extraHelp?: ReactNode;
  publicationState?: HubPublicationState;
};

export function HubCopyProposeForm({
  action,
  what,
  where,
  fields,
  hidden,
  preview,
  liveLabel = HUB_ACTION_LABELS.makeChangesLive,
  changeLabel = HUB_ACTION_LABELS.changeSection,
  copyCurrentLabel = HUB_ACTION_LABELS.useCurrentText,
  extraHelp,
  publicationState = "live-document",
}: Props) {
  const current = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of fields) values[field.id] = field.current;
    return values;
  }, [fields]);

  const [editing, setEditing] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [proposed, setProposed] = useState<Record<string, string>>({});

  const merged = mergeProposedCopy(current, proposed);
  const canPublish = editing && previewed && hasProposedCopy(proposed);
  const previewMode: "live" | "proposed" =
    editing && hasProposedCopy(proposed) ? "proposed" : "live";
  const currentCopy = hubCurrentSectionCopy(publicationState);

  useEffect(() => {
    function onTourStartChange() {
      setEditing(true);
      setPreviewed(false);
      setProposed(emptyProposedCopy(current));
    }
    window.addEventListener(HUB_TOUR_START_CHANGE_EVENT, onTourStartChange);
    return () =>
      window.removeEventListener(HUB_TOUR_START_CHANGE_EVENT, onTourStartChange);
  }, [current]);

  function startChange() {
    setEditing(true);
    setPreviewed(false);
    setProposed(emptyProposedCopy(current));
  }

  function cancel() {
    setEditing(false);
    setPreviewed(false);
    setProposed({});
  }

  function copyCurrent() {
    setProposed({ ...current });
    setPreviewed(false);
  }

  return (
    <div className="space-y-8">
      <div>
        {preview(previewMode === "proposed" ? merged : current, previewMode)}
      </div>

      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            {what}
          </h2>
          <p className="mt-2 hub-help text-[var(--color-text-muted)]">{where}</p>
        </div>

        <HubHelpDetails summary="Where does this appear?">
          <p>{where}</p>
        </HubHelpDetails>
        {extraHelp}

        <section
          data-hub-role="current"
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
        >
          <h3 className="text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {currentCopy.heading}
          </h3>
          {currentCopy.note ? (
            <p className="hub-help text-[var(--color-text-muted)]">{currentCopy.note}</p>
          ) : null}
          <dl className="space-y-3">
            {fields.map((field) => (
              <div key={field.id}>
                <dt className="text-base font-medium text-[var(--color-text-muted)]">
                  {field.label}
                </dt>
                <dd
                  className="mt-1 whitespace-pre-wrap rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-elevated)] px-3 py-2 text-base text-[var(--color-text-body)]"
                  data-readonly="true"
                >
                  {field.kind === "checkbox"
                    ? field.current === "on"
                      ? "Yes"
                      : "No"
                    : field.current || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {!editing ? (
          <button
            type="button"
            data-tour="change-section"
            onClick={startChange}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
          >
            {changeLabel}
          </button>
        ) : (
          <form
            action={action}
            onSubmit={(event) => {
              if (!canPublish) event.preventDefault();
            }}
            className="space-y-6"
          >
            {hidden
              ? Object.entries(hidden).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))
              : null}
            {fields.map((field) => (
              <input
                key={`merged-${field.id}`}
                type="hidden"
                name={field.id}
                value={
                  field.kind === "checkbox"
                    ? merged[field.id] === "on"
                      ? "on"
                      : ""
                    : (merged[field.id] ?? "")
                }
              />
            ))}

            <section
              data-hub-role="proposed"
              className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-action-primary)] p-4"
            >
              <h3 className="text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                What would you like to show instead?
              </h3>
              <p className="hub-help text-[var(--color-text-muted)]">
                Leave a box empty to keep the current website text.
              </p>
              {fields.map((field) => {
                if (field.kind === "textarea") {
                  return (
                    <HubTextAreaField
                      key={field.id}
                      id={`proposed-${field.id}`}
                      name={`proposed-${field.id}`}
                      label={field.label}
                      rows={field.rows}
                      hint={field.hint}
                      value={proposed[field.id] ?? ""}
                      onChange={(event) => {
                        setProposed((prev) => ({
                          ...prev,
                          [field.id]: event.target.value,
                        }));
                        setPreviewed(false);
                      }}
                    />
                  );
                }
                if (field.kind === "select") {
                  return (
                    <HubSelectField
                      key={field.id}
                      id={`proposed-${field.id}`}
                      name={`proposed-${field.id}`}
                      label={field.label}
                      hint={field.hint}
                      value={proposed[field.id] ?? ""}
                      onChange={(event) => {
                        setProposed((prev) => ({
                          ...prev,
                          [field.id]: event.target.value,
                        }));
                        setPreviewed(false);
                      }}
                    >
                      <option value="">Keep the current choice</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </HubSelectField>
                  );
                }
                if (field.kind === "checkbox") {
                  return (
                    <HubCheckboxField
                      key={field.id}
                      id={`proposed-${field.id}`}
                      name={`proposed-${field.id}`}
                      label={field.label}
                      hint={
                        field.hint ??
                        "To turn this off, use current information first, then uncheck."
                      }
                      checked={proposed[field.id] === "on"}
                      onChange={(event) => {
                        setProposed((prev) => ({
                          ...prev,
                          [field.id]: event.target.checked ? "on" : "off",
                        }));
                        setPreviewed(false);
                      }}
                    />
                  );
                }
                return (
                  <HubTextField
                    key={field.id}
                    id={`proposed-${field.id}`}
                    name={`proposed-${field.id}`}
                    label={field.label}
                    type={field.kind === "date" ? "date" : "text"}
                    hint={field.hint}
                    value={proposed[field.id] ?? ""}
                    onChange={(event) => {
                      setProposed((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }));
                      setPreviewed(false);
                    }}
                  />
                );
              })}
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCurrent}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
              >
                {copyCurrentLabel}
              </button>
              <button
                type="button"
                data-tour="preview-changes"
                onClick={() => setPreviewed(true)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
              >
                {HUB_ACTION_LABELS.previewChanges}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-base font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
              >
                {HUB_ACTION_LABELS.cancelChanges}
              </button>
            </div>

            {previewed ? (
              <p className="hub-help text-[var(--color-text-muted)]">
                Check the preview. If it looks right, make it live. The public
                website does not change until you do.
              </p>
            ) : (
              <p className="hub-help text-[var(--color-text-muted)]">
                Preview your changes before they appear on the website.
              </p>
            )}

            <div data-tour="make-live">
              <HubSubmitButton
                variant={canPublish ? "secondary" : "quiet"}
                disabled={!canPublish}
              >
                {liveLabel}
              </HubSubmitButton>
            </div>
            {!canPublish ? (
              <p className="hub-help text-[var(--color-text-muted)]">
                Type a change, then click Preview my changes, then you can make
                it live.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
