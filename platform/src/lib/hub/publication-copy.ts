export type HubPublicationState =
  | "live-document"
  | "draft"
  | "published"
  | "archived";

export function hubPublicationStateFromStatus(
  status: string,
): HubPublicationState {
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  return "draft";
}

export function hubCurrentSectionCopy(state: HubPublicationState) {
  if (state === "draft") {
    return {
      heading: "Current draft",
      note: "Not visible to website visitors yet",
    };
  }
  if (state === "archived") {
    return {
      heading: "Removed from public website",
      note: "Not visible to website visitors.",
    };
  }
  return {
    heading: "Currently on the website",
    note: null as string | null,
  };
}

export function hubPreviewVariant(
  state: HubPublicationState,
  mode: "live" | "proposed",
): "live" | "draft" | "proposed" {
  if (mode === "proposed") return "proposed";
  if (state === "draft" || state === "archived") return "draft";
  return "live";
}

export function mayRemoveFromWebsite(status: string): boolean {
  return status === "published";
}

export type HubLifecycleActions = {
  saveDraft: boolean;
  markReadyForPreview: boolean;
  makeLive: boolean;
  removeFromWebsite: boolean;
  restoreDraft: boolean;
};

/** Status-row actions. Published items must not show draft lifecycle controls. */
export function hubLifecycleActions(status: string): HubLifecycleActions {
  return {
    saveDraft: status === "draft" || status === "preview",
    markReadyForPreview: status === "draft",
    makeLive: status === "draft" || status === "preview",
    removeFromWebsite: status === "published",
    restoreDraft: status === "archived",
  };
}

export function hubDetailsConfirmLabel(status: string): string {
  if (status === "published") return "Make these changes live";
  return "Save my details";
}
