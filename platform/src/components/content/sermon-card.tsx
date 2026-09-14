import Image from "next/image";
import type { SermonPublic } from "@/content/types";

export function SermonCard({ sermon }: { sermon: SermonPublic }) {
  return (
    <article
      id={sermon.id}
      className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
    >
      {sermon.thumbnailSrc ? (
        <div className="relative aspect-video bg-[var(--color-surface-tint)]">
          <Image
            src={sermon.thumbnailSrc}
            alt={sermon.thumbnailAlt || ""}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      ) : null}
      <div className="p-6">
        <h3 className="font-display text-xl font-semibold">{sermon.title}</h3>
        <p className="mt-2 text-readable-sm text-[var(--color-text-muted)]">
          {[sermon.speaker, sermon.sermonDate].filter(Boolean).join(" · ")}
        </p>
        {sermon.summary ? (
          <p className="text-readable mt-3 text-[var(--color-text-muted)]">
            {sermon.summary}
          </p>
        ) : null}
        {sermon.youtubeUrl ? (
          <p className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]">
            Watch on YouTube
          </p>
        ) : null}
      </div>
    </article>
  );
}
