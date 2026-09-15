import { describe, expect, it } from "vitest";
import {
  getAboutLeadPastor,
  getChurchIdentity,
  getFaqs,
  getFeaturedProgram,
  getGivingAccounts,
  getLivestreamPublic,
  getMissionContent,
  getPrayerCta,
  getPublicContactDetails,
  getSermonPlatforms,
  getServiceOfferings,
  getPrivacyPolicy,
  getTermsOfService,
} from "@/content";
import { headquartersServiceTimes, branches } from "@/content/seed/branches";
import { dailyFaithRecharge, sermonHighlight } from "@/content/seed/engagement";
import { givingPageIntro } from "@/content/seed/giving";
import { livestreamPublic, sermonsPageHeader, servicesPageIntro } from "@/content/seed/pages";

const OBVIOUS_DEV_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "lorem ipsum", pattern: /lorem ipsum/i },
  { name: "TODO", pattern: /\bTODO\b/ },
  { name: "FIXME", pattern: /\bFIXME\b/ },
  { name: "PLACEHOLDER token", pattern: /\bPLACEHOLDER\b/ },
  { name: "test@example", pattern: /test@example/i },
  { name: "synthetic .invalid mailbox", pattern: /@example\.invalid/i },
  { name: "dev placeholder label", pattern: /\[dev placeholder\]/i },
  { name: "draft_placeholder", pattern: /draft_placeholder/ },
  { name: "legacy source note", pattern: /legacy source/i },
  { name: "verified URL later", pattern: /verified (live )?url will/i },
  { name: "phase implementation copy", pattern: /not implemented in phase/i },
  { name: "this component will", pattern: /this component will/i },
  { name: "pastoral hub product language", pattern: /pastoral hub/i },
  { name: "future hub product language", pattern: /future hub/i },
  { name: "pre-production review banner", pattern: /pre-production human\/legal review required/i },
  { name: "generic church-template sermons headline", pattern: /experience the word of god anytime/i },
  { name: "generic church-template sermons sub", pattern: /stay spiritually nourished/i },
];

function visitorLegalText(): string {
  return [getPrivacyPolicy(), getTermsOfService()]
    .flatMap((doc) => [
      doc.metaLine,
      ...doc.sections.flatMap((section) => [
        section.heading ?? "",
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ]),
    ])
    .join("\n");
}

async function publicVisitorText(): Promise<string> {
  const identity = getChurchIdentity();
  const live = await getLivestreamPublic();
  const program = await getFeaturedProgram();
  const contact = await getPublicContactDetails();
  const prayer = await getPrayerCta();
  const mission = await getMissionContent();
  const pastor = await getAboutLeadPastor();
  const faqItems = await getFaqs();
  const offerings = await getServiceOfferings();
  const platforms = await getSermonPlatforms();
  const parts = [
    identity.legalName,
    identity.heroHeadline,
    identity.heroSupporting,
    identity.discoverBlurb,
    identity.visionTagline,
    live.heading,
    live.notLiveMessage,
    live.liveMessage,
    livestreamPublic.notLiveMessage,
    sermonsPageHeader.headline,
    sermonsPageHeader.sub,
    servicesPageIntro,
    givingPageIntro.title,
    givingPageIntro.lead,
    givingPageIntro.blessing,
    ...givingPageIntro.supports,
    dailyFaithRecharge.heading,
    dailyFaithRecharge.body,
    sermonHighlight.title,
    sermonHighlight.description,
    contact.primaryEmail,
    prayer.heading,
    ...prayer.body,
    mission.vision,
    ...mission.missionParagraphs,
    ...pastor.bioParagraphs,
    ...faqItems.flatMap((faq) => [faq.question, ...faq.answerParagraphs]),
    ...offerings.flatMap((item) => [item.title, item.body]),
    ...platforms.map((item) => item.description),
    ...((await getGivingAccounts()).flatMap((account) => [
      account.purpose,
      account.description,
      account.note ?? "",
    ])),
    ...headquartersServiceTimes.map((t) => `${t.day} ${t.time}`),
    ...branches.flatMap((branch) => [
      branch.name,
      branch.cityLabel,
      ...branch.addressLines,
    ]),
    program?.title ?? "",
    program?.shortDescription ?? "",
    visitorLegalText(),
  ];
  return parts.join("\n");
}

describe("public content readiness", () => {
  it("does not expose obvious placeholder or developer copy to visitors", async () => {
    const text = await publicVisitorText();
    const hits = OBVIOUS_DEV_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
      (item) => item.name,
    );
    expect(hits).toEqual([]);
  });

  it("does not publish the local featured-program placeholder", async () => {
    const program = await getFeaturedProgram();
    expect(program).toBeNull();
  });
});
