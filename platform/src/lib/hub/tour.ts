/**
 * D1.8 Hub tour definitions — dashboard orientation stays route-local.
 * Contextual page tours are separate optional flows and must never reuse
 * the dashboard Homepage steps on another route.
 */

export const HUB_TOUR_STORAGE_KEY = "kcmi-hub-tour-v2-complete";
export const HUB_TOUR_STEP_STORAGE_KEY = "kcmi-hub-tour-v2-step";
export const HUB_TOUR_ACTIVE_STORAGE_KEY = "kcmi-hub-tour-v2-active";
export const HUB_TOUR_KIND_STORAGE_KEY = "kcmi-hub-tour-v2-kind";
export const HUB_TOUR_VERSION = "v2";
export const HUB_TOUR_REPLAY_EVENT = "kcmi-hub-tour-replay";
export const HUB_TOUR_MENU_EVENT = "kcmi-hub-tour-menu";
export const HUB_TOUR_SELECT_SECTION_EVENT = "kcmi-hub-tour-select-section";
export const HUB_TOUR_SELECT_CATEGORY_EVENT = "kcmi-hub-tour-select-category";
export const HUB_TOUR_START_CHANGE_EVENT = "kcmi-hub-tour-start-change";
export const HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT =
  "kcmi-hub-tour-program-wizard-step";
export const HUB_TOUR_LIVESTREAM_BEGIN_EVENT =
  "kcmi-hub-tour-livestream-begin";

export type HubTourKind =
  | "dashboard"
  | "home"
  | "programs"
  | "livestream";

export type HubTourStep = {
  id: string;
  title: string;
  body: string;
  target: string;
  /** Route this step belongs to — contextual tours never leave this path. */
  href: string;
  openMobileMenu?: boolean;
  closeMobileMenu?: boolean;
  selectHomeSection?: string;
  selectHomeCategory?: string;
  startChange?: boolean;
  /** Program create wizard step (1–5). */
  programWizardStep?: number;
  /** Open livestream start/change form so embed controls mount. */
  livestreamBegin?: "start" | "change";
};

/** First-run orientation — Dashboard only, no cross-route navigation. */
export const HUB_DASHBOARD_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "dashboard-homepage",
    title: "Homepage",
    body: "Change what visitors first see.",
    target: '[data-tour="dashboard-homepage"]',
    href: "/admin",
    closeMobileMenu: true,
  },
  {
    id: "dashboard-programs",
    title: "Programs & Announcements",
    body: "Add upcoming programs here.",
    target: '[data-tour="dashboard-programs"]',
    href: "/admin",
    closeMobileMenu: true,
  },
  {
    id: "dashboard-branches",
    title: "Branches",
    body: "Change branch details, service times and photos.",
    target: '[data-tour="dashboard-branches"]',
    href: "/admin",
    closeMobileMenu: true,
  },
  {
    id: "dashboard-sermons",
    title: "Sermons",
    body: "Add sermon details visitors can watch and read.",
    target: '[data-tour="dashboard-sermons"]',
    href: "/admin",
    closeMobileMenu: true,
  },
  {
    id: "dashboard-livestream",
    title: "Livestream",
    body: "Paste Facebook embed code here when KCMI goes live.",
    target: '[data-tour="dashboard-livestream"]',
    href: "/admin",
    closeMobileMenu: true,
  },
  {
    id: "help-tutorial",
    title: "Help & Tutorial",
    body: "Replay this guide or open page-specific help any time.",
    target: '[data-tour="help-tutorial"]',
    href: "/admin",
    openMobileMenu: true,
  },
] as const;

/** @deprecated Use HUB_DASHBOARD_TOUR_STEPS — kept as alias during D1.8 migration */
export const HUB_TOUR_STEPS = HUB_DASHBOARD_TOUR_STEPS;

/** Homepage contextual — stays on /admin/website/home. */
export const HUB_HOME_CONTEXT_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "home-choose-section",
    title: "Choose a section",
    body: "Pick which part of the homepage you want to update.",
    target: '[data-tour="home-visual-section-banner"]',
    href: "/admin/website/home",
    closeMobileMenu: true,
  },
  {
    id: "home-edit-section",
    title: "Edit this section",
    body: "Open a section to change its words or photo.",
    target: '[data-tour="edit-section"]',
    href: "/admin/website/home",
  },
  {
    id: "home-words-photo",
    title: "Words or Photo",
    body: "Choose Words or Photo for this section.",
    target: '[data-tour="edit-category-words"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
  },
  {
    id: "home-preview",
    title: "Preview",
    body: "Always preview your draft before anything goes public.",
    target: '[data-tour="preview-changes"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
    selectHomeCategory: "words",
    startChange: true,
  },
  {
    id: "home-make-live",
    title: "Make live",
    body: "Only this button publishes your change to the website.",
    target: '[data-tour="make-live"]',
    href: "/admin/website/home",
    selectHomeSection: "banner",
    selectHomeCategory: "words",
    startChange: true,
  },
] as const;

/**
 * Program contextual — shared by create (`/admin/programs/new`) and edit
 * (`/admin/programs/[id]`). Step `href` documents the create path; route
 * matching uses `isProgramsWizardPath` so edit stays on the same wizard.
 */
export const HUB_PROGRAMS_CONTEXT_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "program-about",
    title: "Program name",
    body: "Start with the name, short description, and optional poster photo.",
    target: '[data-tour="program-wizard-about"]',
    href: "/admin/programs/new",
    closeMobileMenu: true,
    programWizardStep: 1,
  },
  {
    id: "program-when",
    title: "When",
    body: "Choose one day or several days. Each day has its own date and sessions.",
    target: '[data-tour="program-wizard-when"]',
    href: "/admin/programs/new",
    programWizardStep: 2,
  },
  {
    id: "program-where",
    title: "Where",
    body: "Say whether this happens at a branch, another venue, online, or both.",
    target: '[data-tour="program-wizard-where"]',
    href: "/admin/programs/new",
    programWizardStep: 3,
  },
  {
    id: "program-link",
    title: "Visitor link",
    body: "Optional registration or video link. The button label is chosen for you.",
    target: '[data-tour="program-wizard-link"]',
    href: "/admin/programs/new",
    programWizardStep: 4,
  },
  {
    id: "program-review",
    title: "Review / Save draft",
    body: "Check the summary, then save as a draft. Nothing is public yet.",
    target: '[data-tour="program-wizard-review"]',
    href: "/admin/programs/new",
    programWizardStep: 5,
  },
] as const;

/** Create or edit wizard (not list, preview, or QA-only fixtures). */
export function isProgramsWizardPath(
  pathname: string | null | undefined,
): boolean {
  const path = (pathname ?? "").replace(/\/$/, "") || "/";
  if (path === "/admin/programs/new") return true;
  if (path === "/admin/programs" || path === "/admin/programs/fixture-published-safety") {
    return false;
  }
  if (path.endsWith("/preview")) return false;
  return /^\/admin\/programs\/[^/]+$/.test(path);
}

/** Whether a tour step is valid on the current route (create+edit aware). */
export function tourStepMatchesRoute(
  step: HubTourStep,
  pathname: string | null | undefined,
): boolean {
  const here = (pathname ?? "").replace(/\/$/, "") || "/";
  const want = step.href.replace(/\/$/, "") || "/";
  if (here === want) return true;
  if (want === "/admin/programs/new" && isProgramsWizardPath(here)) return true;
  return false;
}

/** Livestream contextual — stays on /admin/livestream. */
export const HUB_LIVESTREAM_CONTEXT_TOUR_STEPS: readonly HubTourStep[] = [
  {
    id: "livestream-status",
    title: "Current live status",
    body: "See whether visitors currently see a live video.",
    target: '[data-tour="livestream-status"]',
    href: "/admin/livestream",
    closeMobileMenu: true,
  },
  {
    id: "livestream-start",
    title: "Start or change livestream",
    body: "Use this when KCMI is going live or the Facebook video changes.",
    target: '[data-tour="livestream-start"]',
    href: "/admin/livestream",
  },
  {
    id: "livestream-embed",
    title: "Facebook embed code",
    body: "Paste the Facebook embed code (or video link) for the live video.",
    target: '[data-tour="livestream-embed"]',
    href: "/admin/livestream",
    livestreamBegin: "start",
  },
  {
    id: "livestream-preview",
    title: "Check and Preview",
    body: "Check the Facebook video first. The public page does not change yet.",
    target: '[data-tour="livestream-check-preview"]',
    href: "/admin/livestream",
    livestreamBegin: "start",
  },
  {
    id: "livestream-live",
    title: "Make live / update live video",
    body: "Only this step puts the Facebook video on the Livestream page.",
    target: '[data-tour="livestream-make-live"]',
    href: "/admin/livestream",
    livestreamBegin: "start",
  },
] as const;

export type HubTourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function resolveHubTourKind(pathname: string | null | undefined): HubTourKind {
  const path = (pathname ?? "").replace(/\/$/, "") || "/";
  if (path === "/admin/website/home") return "home";
  if (isProgramsWizardPath(path)) return "programs";
  if (path === "/admin/livestream") return "livestream";
  return "dashboard";
}

export function hubTourStepsForKind(kind: HubTourKind): readonly HubTourStep[] {
  switch (kind) {
    case "home":
      return HUB_HOME_CONTEXT_TOUR_STEPS;
    case "programs":
      return HUB_PROGRAMS_CONTEXT_TOUR_STEPS;
    case "livestream":
      return HUB_LIVESTREAM_CONTEXT_TOUR_STEPS;
    default:
      return HUB_DASHBOARD_TOUR_STEPS;
  }
}

export function hubTourEntryPath(kind: HubTourKind): string {
  switch (kind) {
    case "home":
      return "/admin/website/home";
    case "programs":
      return "/admin/programs/new";
    case "livestream":
      return "/admin/livestream";
    default:
      return "/admin";
  }
}

/** Prefer a contextual tour when Help is opened on that page; else dashboard. */
export function resolveReplayTourKind(pathname: string | null | undefined): HubTourKind {
  const path = (pathname ?? "").replace(/\/$/, "") || "/";
  if (path === "/admin/website/home") return "home";
  if (isProgramsWizardPath(path) || path === "/admin/programs") return "programs";
  if (path === "/admin/livestream") return "livestream";
  return "dashboard";
}

/**
 * Stay on the current create/edit program page when replaying Help there.
 * Default entry for programs remains `/admin/programs/new`.
 */
export function resolveTourEntryHref(
  kind: HubTourKind,
  pathname: string | null | undefined,
): string {
  const here = (pathname ?? "").replace(/\/$/, "") || "/";
  if (kind === "programs" && isProgramsWizardPath(here)) return here;
  return hubTourEntryPath(kind);
}

export function isHubTourComplete(storage: HubTourStorage | null): boolean {
  if (!storage) return false;
  return (
    storage.getItem(HUB_TOUR_STORAGE_KEY) === "true" ||
    storage.getItem("kcmi-hub-tour-v1-complete") === "true"
  );
}

export function markHubTourComplete(storage: HubTourStorage): void {
  storage.setItem(HUB_TOUR_STORAGE_KEY, "true");
  storage.removeItem(HUB_TOUR_STEP_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_ACTIVE_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_KIND_STORAGE_KEY);
}

export function resetHubTour(storage: HubTourStorage): void {
  storage.removeItem(HUB_TOUR_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_STEP_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_ACTIVE_STORAGE_KEY);
  storage.removeItem(HUB_TOUR_KIND_STORAGE_KEY);
  storage.removeItem("kcmi-hub-tour-v1-complete");
  storage.removeItem("kcmi-hub-tour-v1-step");
  storage.removeItem("kcmi-hub-tour-v1-active");
}

export function readHubTourKind(storage: HubTourStorage | null): HubTourKind {
  if (!storage) return "dashboard";
  const raw = storage.getItem(HUB_TOUR_KIND_STORAGE_KEY);
  if (raw === "home" || raw === "programs" || raw === "livestream" || raw === "dashboard") {
    return raw;
  }
  return "dashboard";
}

export function writeHubTourKind(storage: HubTourStorage, kind: HubTourKind): void {
  storage.setItem(HUB_TOUR_KIND_STORAGE_KEY, kind);
}

export function readHubTourStepIndex(
  storage: HubTourStorage | null,
  stepCount = HUB_DASHBOARD_TOUR_STEPS.length,
): number {
  if (!storage) return 0;
  const raw = storage.getItem(HUB_TOUR_STEP_STORAGE_KEY);
  const parsed = raw == null ? 0 : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, Math.max(0, stepCount - 1));
}

export function writeHubTourStepIndex(
  storage: HubTourStorage,
  index: number,
  stepCount = HUB_DASHBOARD_TOUR_STEPS.length,
): void {
  storage.setItem(
    HUB_TOUR_STEP_STORAGE_KEY,
    String(Math.max(0, Math.min(index, Math.max(0, stepCount - 1)))),
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
