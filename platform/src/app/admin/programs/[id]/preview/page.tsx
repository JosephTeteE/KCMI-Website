import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";

type Params = Promise<{ id: string }>;

function formatProgramDates(
  startsAt: string | null,
  endsAt: string | null,
): string | null {
  if (!startsAt && !endsAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (startsAt) return fmt(startsAt);
  return endsAt ? fmt(endsAt) : null;
}

export default async function ProgramPreviewPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session || !staffHasPermission(session.profile, "hub.access")) {
    notFound();
  }

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select(
      `
      id,
      title,
      short_description,
      body_text,
      starts_at,
      ends_at,
      cta_label,
      cta_url,
      placement,
      status,
      featured_media:media_assets!programs_featured_media_id_fkey (
        public_url,
        alt_text,
        width_px,
        height_px
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!program) notFound();

  const media = Array.isArray(program.featured_media)
    ? program.featured_media[0]
    : program.featured_media;
  const datesLabel = formatProgramDates(program.starts_at, program.ends_at);

  return (
    <div>
      <HubPageHeader
        title="Program preview"
        description="Hub-only preview — this page is not a public website URL."
        backHref={`/admin/programs/${program.id}`}
        backLabel="Back to editor"
        actions={<HubStatusBadge status={program.status} />}
      />

      <div
        role="status"
        className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]"
      >
        Staff preview only. Visitors will not see this until the program is
        published.
      </div>

      <article className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-brand)] text-[var(--color-text-on-brand)] shadow-[var(--shadow-soft)]">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 px-6 py-10 sm:px-10">
            <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
              {program.placement === "featured"
                ? "Featured program"
                : "Program"}
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              {program.title}
            </h2>
            {datesLabel ? (
              <p className="text-sm text-white/80">{datesLabel}</p>
            ) : null}
            <p className="max-w-xl text-white/90">
              {program.short_description || "No short description yet."}
            </p>
            {program.body_text ? (
              <p className="max-w-xl whitespace-pre-wrap text-sm text-white/80">
                {program.body_text}
              </p>
            ) : null}
            {program.cta_label && program.cta_url ? (
              <Link
                href={program.cta_url}
                className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
              >
                {program.cta_label}
              </Link>
            ) : null}
          </div>
          <div className="relative min-h-48 bg-[color-mix(in_srgb,var(--kcmi-lavender)_35%,var(--kcmi-violet))] lg:min-h-full">
            {media?.public_url ? (
              <Image
                src={media.public_url}
                alt={media.alt_text || ""}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
