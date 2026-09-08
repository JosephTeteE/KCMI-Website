/**
 * TEST-ONLY long-content fixtures. Do not import into production seeds.
 */
export const stress = {
  email:
    "very.long.ministry.contact.address.for.layout.stress.testing@kingdomcovenantministriesinternational.example.invalid",
  phone: "+233 555 582 826 / +228 94 43 38 85 / +234 9134 44 8322 (stress)",
  branchName:
    "Kingdom Covenant Ministries International — Cape Coast Campus Fellowship Conference Room Branch",
  programTitle:
    "Annual Covenant Convention and Family Discipleship Gathering of the Nations",
  sermonTitle:
    "Raising Kings To Build The Kingdom: A Message of Hope, Humor, and Compassion for Families",
  ctaLabel: "Plan a visit to our Port Harcourt headquarters this Sunday morning",
  addressLines: [
    "Okuruola Wonodi Close",
    "Off Stadium Road, Port Harcourt",
    "Rivers State, Federal Republic of Nigeria",
    "P.O Box 2595, Diobu — additional line for wrapping stress",
  ],
  expandedProse:
    "Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ! ".repeat(
      3,
    ),
} as const;
