import type {
  DailyFaithRecharge,
  GivingCta,
  NavItem,
  PrayerCta,
  PublicContact,
  SermonHighlight,
  SocialLink,
  FeaturedProgram,
} from "@/content/types";

/** VERIFIED contact-us.html / HQ */
export const publicContact: PublicContact = {
  primaryEmail: "contact@kcmi-rcc.org",
  primaryEmailLabel: "Email KCMI",
  primaryPhoneDisplay: "+234 9134 44 8322",
  primaryPhoneTel: "+2349134448322",
  intro:
    "Write or call the church office. Prayer and care requests can be shared through the Prayer, Pastoral Care, and Welfare pages.",
};

/** Planned clean routes (C1 shell links; page bodies arrive in later phases) */
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Locations", href: "/locations" },
  { label: "Services", href: "/services" },
  { label: "Sermons", href: "/sermons" },
  { label: "Contact", href: "/contact" },
];

export const headerCta: NavItem = {
  label: "Watch Live",
  href: "/livestream",
};

export const footerNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Locations", href: "/locations" },
  { label: "Services", href: "/services" },
  { label: "Sermons", href: "/sermons" },
  { label: "Giving", href: "/giving" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" },
];

export const footerLegalNav: NavItem[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

/** VERIFIED index.html footer / schema — WhatsApp # omitted */
export const socialLinks: SocialLink[] = [
  { label: "YouTube", href: "https://www.youtube.com/@rehoboth-tv" },
  { label: "Facebook", href: "https://www.facebook.com/share/18bfxXA9Sj/?mibextid=LQQJ4d" },
  { label: "Instagram", href: "https://www.instagram.com/kcmiworldwide" },
  { label: "X (Twitter)", href: "https://twitter.com/kcmi_official" },
  {
    label: "Apostle Frank on TikTok",
    href: "https://www.tiktok.com/@frank.aikins",
    personal: true,
  },
];

export const dailyFaithRecharge: DailyFaithRecharge = {
  heading: "Daily Faith Recharge",
  body: "Short daily encouragement to strengthen your walk with Christ.",
  spotify: {
    label: "Listen on Spotify",
    href: "https://open.spotify.com/show/6xYjccKxPNSCbBHbnPiEQq",
  },
};

export const prayerCta: PrayerCta = {
  heading: "Prayer Requests",
  verse: "The effective, fervent prayer of a righteous man avails much.",
  verseReference: "James 5:16",
  body: [
    "We believe in the power of prayer and invite you to share your requests with us. Our dedicated prayer team is committed to lifting up your needs and concerns before the Lord.",
    "No matter what you're facing, know that you're not alone.",
  ],
  ctaLabel: "Submit Prayer Request",
  ctaHref: "/prayer",
};

export const givingCta: GivingCta = {
  heading: "Give to KCMI",
  verse:
    "Whoever brings blessing will be enriched, and one who waters will himself be watered.",
  verseReference: "Proverbs 11:25",
  ctaLabel: "Give Now",
  ctaHref: "/giving",
};

export const sermonHighlight: SermonHighlight = {
  title: "Sermons & media",
  description:
    "Watch and listen to messages from Rehoboth Wells and KCMI gatherings on our YouTube channel.",
  ctaLabel: "Listen now",
  ctaHref: "/sermons",
  youtubeChannelUrl: "https://www.youtube.com/@rehoboth-tv",
  youtubeChannelLabel: "YouTube · @rehoboth-tv",
};

/**
 * No confidently current published program exists in main-site HTML
 * (legacy promos load from an external Google Sheet).
 * Development-only placeholder — never present as factual church schedule.
 */
export const featuredProgramPlaceholder: FeaturedProgram = {
  id: "dev-placeholder-program",
  title: "[Dev placeholder] Featured program",
  shortDescription:
    "This is a non-production layout placeholder. It is not a published KCMI event.",
  datesLabel: null,
  imageSrc: null,
  imageAlt: "",
  ctaLabel: "View events",
  ctaHref: "/events",
  placement: "featured",
  status: "draft_placeholder",
};
