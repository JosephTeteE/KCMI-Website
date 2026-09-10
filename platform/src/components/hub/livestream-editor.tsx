"use client";

import { useState } from "react";
import { FacebookVideoEmbed } from "@/components/content/facebook-embed";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { HubSubmitButton, HubTextAreaField } from "@/components/hub/hub-form-fields";
import {
  FACEBOOK_EMBED_EXAMPLE,
  parseFacebookLivestreamInput,
} from "@/lib/cms/facebook-url";
import {
  livestreamConfirmLabel,
  type LivestreamFlow,
} from "@/lib/hub/livestream-state";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { updateLivestreamSettings } from "@/app/admin/livestream/actions";

type Props = {
  currentUrl: string | null;
  isLive: boolean;
  heading: string;
  liveMessage: string;
  notLiveMessage: string;
};

export function LivestreamEditor({
  currentUrl,
  isLive,
  heading,
  liveMessage,
  notLiveMessage,
}: Props) {
  const [flow, setFlow] = useState<LivestreamFlow>("idle");
  const [embedInput, setEmbedInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [checkedUrl, setCheckedUrl] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const editingVideo = flow === "start" || flow === "change";
  const showingLivePreview = isLive || flow === "start" || flow === "change";

  function checkAndPreview() {
    setCheckError(null);
    const raw = embedInput.trim() || linkInput.trim();
    if (!raw) {
      if (currentUrl && flow === "change") {
        setCheckedUrl(currentUrl);
        return;
      }
      setCheckedUrl(null);
      setCheckError(
        "Paste the Facebook embed code first. Copy it from Facebook, then try again.",
      );
      return;
    }
    const parsed = parseFacebookLivestreamInput(raw);
    if (!parsed.ok) {
      setCheckedUrl(null);
      setCheckError(parsed.error);
      return;
    }
    setCheckedUrl(parsed.url);
  }

  function begin(next: LivestreamFlow) {
    setFlow(next);
    setCheckedUrl(null);
    setCheckError(null);
    setEmbedInput("");
    setLinkInput("");
  }

  const previewUrl = checkedUrl ?? (showingLivePreview ? currentUrl : null);
  const confirmLabel = livestreamConfirmLabel(
    flow === "start" ? "start" : flow === "change" ? "update" : "none",
  );

  return (
    <div className="space-y-8">
      <HubPreviewFrame
        title="Livestream preview"
        variant={checkedUrl ? "proposed" : "live"}
      >
        <div className="p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {heading}
          </p>
          <p className="mt-3 text-sm">
            {showingLivePreview ? liveMessage : notLiveMessage}
          </p>
          {showingLivePreview && previewUrl ? (
            <div className="mt-4">
              <FacebookVideoEmbed url={previewUrl} title="Facebook livestream preview" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              No live video will show.
            </p>
          )}
        </div>
      </HubPreviewFrame>

      <div className="space-y-6">
        <section
          data-hub-role="current"
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Currently on the website
          </h2>
          <p className="mt-2 text-sm font-medium">
            {isLive ? "A live video is on" : "We are not live right now"}
          </p>
          {isLive && currentUrl ? (
            <div className="mt-4">
              <FacebookVideoEmbed url={currentUrl} title="Current Facebook livestream" />
            </div>
          ) : currentUrl ? (
            <p className="mt-2 break-all text-sm text-[var(--color-text-muted)]">
              Facebook video on file: {currentUrl}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              No Facebook video is saved yet.
            </p>
          )}
        </section>

        {!isLive && flow === "idle" ? (
          <button
            type="button"
            onClick={() => begin("start")}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
          >
            {HUB_ACTION_LABELS.startLivestream}
          </button>
        ) : null}

        {isLive && flow === "idle" ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => begin("change")}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
            >
              {HUB_ACTION_LABELS.changeLiveVideo}
            </button>
            <form action={updateLivestreamSettings}>
              <input type="hidden" name="existing_facebook_url" value={currentUrl ?? ""} />
              <input type="hidden" name="is_live" value="false" />
              <input type="hidden" name="facebook_input" value="" />
              <HubSubmitButton variant="danger">
                {HUB_ACTION_LABELS.turnOffLivestream}
              </HubSubmitButton>
            </form>
          </div>
        ) : null}

        {editingVideo ? (
          <form action={updateLivestreamSettings} className="space-y-6">
            <input type="hidden" name="existing_facebook_url" value={currentUrl ?? ""} />
            <input type="hidden" name="is_live" value="true" />
            <input
              type="hidden"
              name="facebook_input"
              value={embedInput.trim() || linkInput.trim()}
            />

            <div className="space-y-4" data-hub-role="proposed">
              <HubTextAreaField
                id="facebook_embed"
                name="facebook_embed"
                label="Paste Facebook embed code"
                rows={6}
                value={embedInput}
                onChange={(event) => {
                  setEmbedInput(event.target.value);
                  setCheckedUrl(null);
                }}
                hint="Copy the Embed code from Facebook. We will not save the code itself — only the Facebook video link."
              />
              <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
                <li>Open the KCMI livestream/video on Facebook.</li>
                <li>Choose the Embed option.</li>
                <li>Copy the embed code.</li>
                <li>Paste it here.</li>
                <li>Click Check and Preview.</li>
              </ol>
              <HubHelpDetails summary="Show me an example">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs">
                  {FACEBOOK_EMBED_EXAMPLE}
                </pre>
              </HubHelpDetails>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
                onClick={() => setShowLink((value) => !value)}
              >
                Don&apos;t have embed code? Paste the Facebook video link instead.
              </button>
              {showLink ? (
                <HubTextAreaField
                  id="facebook_url"
                  name="facebook_url_ui"
                  label="Facebook video link"
                  rows={2}
                  value={linkInput}
                  onChange={(event) => {
                    setLinkInput(event.target.value);
                    setCheckedUrl(null);
                  }}
                />
              ) : null}
              <button
                type="button"
                onClick={checkAndPreview}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold"
              >
                {HUB_ACTION_LABELS.checkAndPreview}
              </button>
              {checkError ? (
                <p role="alert" className="text-sm text-[var(--color-destructive)]">
                  {checkError}
                </p>
              ) : null}
              {checkedUrl ? (
                <p className="text-sm font-medium text-[var(--color-success)]">
                  ✓ Facebook video recognized
                </p>
              ) : null}
            </div>

            <p className="text-sm text-[var(--color-text-muted)]">
              {flow === "change"
                ? "The public livestream does not change until you update the live video."
                : "Visitors will see the Facebook video on the Livestream page after you start it."}
            </p>

            <div className="flex flex-wrap gap-3">
              {confirmLabel ? (
                <HubSubmitButton variant="secondary">{confirmLabel}</HubSubmitButton>
              ) : null}
              <button
                type="button"
                onClick={() => begin("idle")}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-5 text-sm font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
              >
                {HUB_ACTION_LABELS.cancelChanges}
              </button>
            </div>
          </form>
        ) : null}

        {isLive && flow === "change" ? (
          <form action={updateLivestreamSettings}>
            <input type="hidden" name="existing_facebook_url" value={currentUrl ?? ""} />
            <input type="hidden" name="is_live" value="false" />
            <input type="hidden" name="facebook_input" value="" />
            <HubSubmitButton variant="danger">
              {HUB_ACTION_LABELS.turnOffLivestream}
            </HubSubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
