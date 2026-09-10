export const HUB_TOUR_STORAGE_KEY = "kcmi-hub-tour-v1-complete";
export const HUB_TOUR_VERSION = "v1";
export const HUB_TOUR_REPLAY_EVENT = "kcmi-hub-tour-replay";

export type HubTourStep = {
  id: string;
  title: string;
  body: string;
};

export const HUB_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    body: "Choose what you want to update.",
  },
  {
    id: "homepage",
    title: "Homepage",
    body: "Change the first things visitors see.",
  },
  {
    id: "programs",
    title: "Programs",
    body: "Add or update announcements and programs.",
  },
  {
    id: "branches",
    title: "Branches",
    body: "Change branch details, service times and photos.",
  },
  {
    id: "livestream",
    title: "Livestream",
    body: "Paste the Facebook embed code when KCMI goes live.",
  },
  {
    id: "preview-publish",
    title: "Preview before it goes public",
    body: "Preview first. Nothing changes publicly until you make it live.",
  },
] as const;

export type HubTourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isHubTourComplete(storage: HubTourStorage | null): boolean {
  if (!storage) return false;
  return storage.getItem(HUB_TOUR_STORAGE_KEY) === "true";
}

export function markHubTourComplete(storage: HubTourStorage): void {
  storage.setItem(HUB_TOUR_STORAGE_KEY, "true");
}

export function resetHubTour(storage: HubTourStorage): void {
  storage.removeItem(HUB_TOUR_STORAGE_KEY);
}
