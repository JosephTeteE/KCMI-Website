import type { GivingAccount } from "@/content/types";

/**
 * Authoritative public giving destinations for Phase C.
 * Source: public/giving-kcmi.html (VERIFIED).
 * Do not duplicate account numbers in components — import via getGivingAccounts().
 * Hub dual-approval editing is Phase D+ (ADR-0006) — not implemented here.
 */
export const givingAccounts: GivingAccount[] = [
  {
    id: "general-ecobank",
    purpose: "General Giving",
    description:
      "For tithes, offerings, and seed gifts to support the general ministry work.",
    accountName: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
    bankName: "ECOBANK",
    accountNumber: "1602002211",
    note: "Please title your payment description accordingly.",
  },
  {
    id: "care-union",
    purpose: "Care Group Giving",
    description:
      "For welfare, prisoner, needy, and less-privileged support.",
    accountName: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
    bankName: "UNION BANK",
    accountNumber: "0055484937",
    note: 'Please include "Care Group" in your payment description.',
  },
  {
    id: "international-zenith",
    purpose: "International Giving",
    description:
      "For donations in foreign currencies (USD, GBP, EUR) from outside Nigeria.",
    accountName: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
    bankName: "ZENITH BANK",
    swiftCode: "ZEIBNGLA",
    accountsByCurrency: [
      { currency: "USD", accountNumber: "5074346861" },
      { currency: "GBP", accountNumber: "5061372275" },
      { currency: "EUR", accountNumber: "5081098025" },
    ],
    note: "Please title your payment description accordingly.",
  },
];

export const givingPageIntro = {
  title: "Giving to KCMI",
  lead: "Your giving is vital to the work we do at KCMI.",
  supports: [
    "General Ministry Work: This includes everything from our weekly services and discipleship programs to community outreach and administrative support that keeps the church running smoothly.",
    'Care Groups\' Charity Work: Through our "Care Groups," we are able to extend a helping hand to those in need in our community, providing assistance and showing God\'s love in tangible ways.',
  ],
  blessing:
    "Thank you for your generosity and partnership in advancing God's Kingdom. May God bless you abundantly as you give! Remember, your giving is an investment into the Kingdom of God and will yield a great harvest.",
} as const;
