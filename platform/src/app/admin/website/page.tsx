import Link from "next/link";
import { HubPageHeader } from "@/components/hub/hub-page-header";

const SECTIONS = [
  {
    href: "/admin/website/home",
    title: "Homepage",
    body: "Top banner, welcome message, prayer and giving invitations, featured program, and photos.",
  },
  {
    href: "/admin/website/about",
    title: "About KCMI",
    body: "Who we are, vision, mission, leadership introduction, and the Lead Pastor story.",
  },
  {
    href: "/admin/website/services",
    title: "Ministries and care",
    body: "Cell fellowships, service teams, sermons, and care request buttons.",
  },
  {
    href: "/admin/website/faqs",
    title: "Questions people ask",
    body: "Public questions and answers.",
  },
  {
    href: "/admin/website/global",
    title: "Information shown across the website",
    body: "Public email and phone, Daily Faith Recharge, social buttons, livestream visitor messages, and the bottom of every page.",
  },
  {
    href: "/admin/website/sermons",
    title: "Sermons page wording",
    body: "Sermons page headline and watch options. Individual sermons are under Sermons.",
  },
] as const;

export default function WebsiteContentIndexPage() {
  return (
    <div>
      <HubPageHeader
        title="Website pages"
        description="Change wording visitors read. Preview first. Nothing goes public until you make it live."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block min-h-32 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 hover:border-[var(--color-action-primary)]"
            >
              <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {section.body}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
