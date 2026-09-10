"use client";

import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { saveFaqsDocument } from "@/app/admin/website/actions";
import type { FaqsDocument } from "@/content/website/schemas";

export function FaqsWebsiteEditor({ faqs }: { faqs: FaqsDocument }) {
  const items = [...faqs.items];
  while (items.length < 7) {
    items.push({ id: "", question: "", answerParagraphs: [] });
  }

  const hidden: Record<string, string> = {};
  const fields = items.flatMap((item, index) => {
    hidden[`faqId${index}`] = item.id;
    return [
      {
        id: `faqQuestion${index}`,
        label: `Question ${index + 1}`,
        kind: "text" as const,
        current: item.question,
      },
      {
        id: `faqAnswer${index}`,
        label: `Answer ${index + 1} (one paragraph per line)`,
        kind: "textarea" as const,
        current: item.answerParagraphs.join("\n"),
        rows: 4,
      },
    ];
  });

  return (
    <HubCopyProposeForm
      action={saveFaqsDocument}
      what="Questions people ask"
      where="The FAQs page on the public website."
      hidden={hidden}
      extraHelp={
        <HubHelpDetails summary="What is this?">
          These are the questions and answers visitors read. Leave a question
          empty to keep the current website text for that item.
        </HubHelpDetails>
      }
      fields={fields}
      preview={(values, mode) => (
        <HubPreviewFrame title="FAQs" live={mode === "live"}>
          <div className="space-y-4 p-6">
            {items.map((item, index) => (
              <div key={`preview-faq-${index}`}>
                <h3 className="font-semibold">
                  {values[`faqQuestion${index}`] || item.question}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                  {values[`faqAnswer${index}`] || item.answerParagraphs.join("\n")}
                </p>
              </div>
            ))}
          </div>
        </HubPreviewFrame>
      )}
    />
  );
}
