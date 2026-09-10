import { facebookControlledEmbedSrc } from "@/lib/cms/facebook-url";

type Props = {
  url: string;
  title?: string;
};

export function FacebookVideoEmbed({
  url,
  title = "Facebook video preview",
}: Props) {
  const src = facebookControlledEmbedSrc(url);
  if (!src) return null;

  return (
    <div className="aspect-video overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-tint)]">
      <iframe
        src={src}
        title={title}
        className="size-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
