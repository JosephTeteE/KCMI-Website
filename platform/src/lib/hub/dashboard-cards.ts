export type HubDashboardCard = {
  title: string;
  href: string;
  outcome: string;
};

export const HUB_DASHBOARD_CARDS: readonly HubDashboardCard[] = [
  {
    title: "Homepage",
    href: "/admin/website/home",
    outcome: "Change the first things visitors see when they open the website.",
  },
  {
    title: "Programs & Announcements",
    href: "/admin/programs",
    outcome: "Add or update programs and announcements shown on the website.",
  },
  {
    title: "Events",
    href: "/admin/events",
    outcome: "Create and publish camps, conferences, and other gatherings.",
  },
  {
    title: "Branches",
    href: "/admin/branches",
    outcome: "Change service times, addresses and branch photos.",
  },
  {
    title: "Sermons",
    href: "/admin/sermons",
    outcome: "Add sermon titles and YouTube links for the Sermons page.",
  },
  {
    title: "Livestream",
    href: "/admin/livestream",
    outcome: "Paste the Facebook embed code when KCMI goes live.",
  },
  {
    title: "Photos / Media Library",
    href: "/admin/media",
    outcome: "Upload photos that can be used on website pages.",
  },
  {
    title: "Giving",
    href: "/admin/giving",
    outcome:
      "Review Giving destinations and propose bank-detail changes for dual approval.",
  },
] as const;

/** Cards that require at least one of these permissions to show on the dashboard. */
export const HUB_DASHBOARD_CARD_PERMISSIONS: Record<
  string,
  readonly string[] | undefined
> = {
  "/admin/giving": ["giving.propose", "giving.approve", "audit.read"],
};
