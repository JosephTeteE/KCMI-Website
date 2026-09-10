import type { LegalDocument } from "@/content/types";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <p className="text-readable-sm font-medium text-[var(--color-text-muted)]">
        {doc.metaLine}
      </p>
      {/*
        staleNotes stay in seed data for governance (see docs/CONTENT_VERIFICATION_GAPS.md).
        They are not rendered on the public legal pages.
      */}
      {doc.sections.map((section, idx) => (
        <section key={section.heading ?? `sec-${idx}`} className="space-y-3">
          {section.heading ? (
            <h2 className="font-display text-2xl font-semibold">
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-readable text-[var(--color-text-muted)]">
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="list-disc space-y-2 pl-5 text-readable text-[var(--color-text-muted)]">
              {section.bullets.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
