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
];

function visitorLegalText(): string {
  return [getPrivacyPolicy(), getTermsOfService()]
    .flatMap((doc) =>
      doc.sections.flatMap((section) => [
        section.heading ?? "",
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ]),
    )
    .join("\n");
}

async function publicVisitorText(): Promise<string> {
  const identity = getChurchIdentity();
  const live = await getLivestreamPublic();
  const program = await getFeaturedProgram();
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
    getPublicContactDetails().primaryEmail,
    getPrayerCta().heading,
    ...getPrayerCta().body,
    getMissionContent().vision,
    ...getMissionContent().missionParagraphs,
    ...getAboutLeadPastor().bioParagraphs,
    ...getFaqs().flatMap((faq) => [faq.question, ...faq.answerParagraphs]),
    ...getServiceOfferings().flatMap((item) => [item.title, item.body]),
    ...getSermonPlatforms().map((item) => item.description),
    ...getGivingAccounts().flatMap((account) => [
      account.purpose,
      account.description,
      account.note ?? "",
    ]),
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
