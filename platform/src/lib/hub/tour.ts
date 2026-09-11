export const HUB_TOUR_STORAGE_KEY = "kcmi-hub-tour-v1-complete";
export const HUB_TOUR_STEP_STORAGE_KEY = "kcmi-hub-tour-v1-step";
export const HUB_TOUR_ACTIVE_STORAGE_KEY = "kcmi-hub-tour-v1-active";
export const HUB_TOUR_VERSION = "v1";
export const HUB_TOUR_REPLAY_EVENT = "kcmi-hub-tour-replay";
export const HUB_TOUR_MENU_EVENT = "kcmi-hub-tour-menu";
export const HUB_TOUR_SELECT_SECTION_EVENT = "kcmi-hub-tour-select-section";
export const HUB_TOUR_SELECT_CATEGORY_EVENT = "kcmi-hub-tour-select-category";
export const HUB_TOUR_START_CHANGE_EVENT = "kcmi-hub-tour-start-change";

export type HubTourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector using data-tour attribute */
  target: string;
  href: string;
  openMobileMenu?: boolean;
  /** When set, ask Homepage editor to open this section before highlighting */
  selectHomeSection?: string;
  /** When set, ask Homepage editor to open this Words/Photo/Buttons category */
  selectHomeCategory?: string;
  /** When true, open the Change form (does not save content) */
  startChange?: boolean;
};

export const HUB_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "dashboard-homepage",
    title: "Homepage",
    body: "Change what visitors first see.",
    target: '[data-tour="dashboard-homepage"]',
    href: "/admin",
  },
  {
    id: "dashboard-programs",
    title: "Programs & Announcements",
    body: "Add upcoming programs here.",
    target: '[data-tour="dashboard-programs"]',
    href: "/admin",
  },
  {
    id: "dashboard-branches",
    title: "Branches",
    body: "Change branch details, service times and photos.",
    target: '[data-tour="dashboard-branches"]',
    href: "/admin",
  },
  {
    id: "dashboard-livestream",
    title: "Livestream",
    body: "Paste Facebook embed code here when KCMI goes live.",
    target: '[data-tour="dashboard-livestream"]',
    href: "/admin",
  },
  {
    id: "help-tutorial",
    title: "Help & Tutorial",
    body: "Replay this guide at any time.",
    target: '[data-tour="help-tutorial"]',
    href: "/admin",
    openMobileMenu: true,
  },
  {
    id: "home-visual-overview",
    title: "Homepage sections",
    body: "See each part of the homepage, then choose what to update.",
    target: '[data-tour="home-section-chooser"]',
    href: "/admin/website/home",
  },
  {
    id: "home-visual-section-banner",
    title: "Top of Homepage",
    body: "This is the first section visitors see. Open it to edit words, photo, or buttons.",
    target: '[data-tour="home-visual-section-banner"]',
    href: "/admin/website/home",
  },
  {
    id: "edit-category-words",
    title: "Choose Words",
    body: "Pick Words, Photo, or Buttons for this section.",
    target: '[data-tour="edit-category-words"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
  },
  {
    id: "change-section",
    title: "Change this section",
    body: "Click Change to edit. Nothing goes public until you make it live.",
    target: '[data-tour="change-section"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
    selectHomeCategory: "words",
  },
  {
    id: "preview-changes",
    title: "Preview my changes",
    body: "Always preview first so you can see what visitors will see.",
    target: '[data-tour="preview-changes"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
    selectHomeCategory: "words",
    startChange: true,
  },
  {
    id: "make-live",
    title: "Make this live",
    body: "Only this button publishes your change to the public website.",
    target: '[data-tour="make-live"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
    selectHomeCategory: "words",
    startChange: true,
  },
] as const;

export type HubTourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isHubTourComplete(storage: HubTourStorage | null): boolean {
  if (!storage) return false;
  return storage.getItem(HUB_TOUR_STORAGE_KEY) === "true";
}

export function markHubTourComplete(storage: HubTourStorage): void {
  storage.setItem(HUB_TOUR_STORAGE_KEY, "true");
  storage.removeItem(HUB_TOUR_STEP_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_ACTIVE_STORAGE_KEY);
}

export function resetHubTour(storage: HubTourStorage): void {
  storage.removeItem(HUB_TOUR_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_STEP_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_ACTIVE_STORAGE_KEY);
}

export function readHubTourStepIndex(storage: HubTourStorage | null): number {
  if (!storage) return 0;
  const raw = storage.getItem(HUB_TOUR_STEP_STORAGE_KEY);
  const parsed = raw == null ? 0 : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, HUB_TOUR_STEPS.length - 1);
}

export function writeHubTourStepIndex(
  storage: HubTourStorage,
  index: number,
): void {
  storage.setItem(
    HUB_TOUR_STEP_STORAGE_KEY,
    String(Math.max(0, Math.min(index, HUB_TOUR_STEPS.length - 1))),
  );
}

export function isHubTourActive(storage: HubTourStorage | null): boolean {
  if (!storage) return false;
  return storage.getItem(HUB_TOUR_ACTIVE_STORAGE_KEY) === "true";
}

export function setHubTourActive(storage: HubTourStorage, active: boolean): void {
  if (active) storage.setItem(HUB_TOUR_ACTIVE_STORAGE_KEY, "true");
  else storage.removeItem(HUB_TOUR_ACTIVE_STORAGE_KEY);
}

export function hubTourTargetSelector(step: HubTourStep): string {
  return step.target;
}
