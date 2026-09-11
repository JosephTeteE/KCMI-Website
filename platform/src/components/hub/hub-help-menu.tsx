"use client";

import { replayHubTour } from "@/components/hub/hub-tour";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";

export function HubHelpMenu({ onAction }: { onAction?: () => void }) {
  return (
    <div className="mt-6 space-y-2" data-tour="help-tutorial">
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        Help & Tutorial
      </p>
      <button
        type="button"
        onClick={() => {
          onAction?.();
          replayHubTour();
        }}
        className="inline-flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-base font-semibold text-[var(--color-action-primary)] hover:bg-[var(--kcmi-off-white)]"
      >
        {HUB_ACTION_LABELS.replayTour}
      </button>
    </div>
  );
}
